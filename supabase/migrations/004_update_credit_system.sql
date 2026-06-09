-- Update initial signup credits to 50 and daily credits to 10
-- Also add credit costs and subscription packages

-- Update the initialize_user_credits function to give 50 credits on signup
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code VARCHAR(50);
BEGIN
    -- Generate unique referral code
    new_referral_code := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
    
    INSERT INTO public.user_credits (
        user_id,
        daily_credits,
        permanent_credits,
        referral_code,
        last_daily_reset
    ) VALUES (
        NEW.id,
        10, -- Updated daily credits to 10
        50, -- Give 50 permanent credits on signup
        new_referral_code,
        NOW()
    );
    
    -- Log the signup bonus transaction
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        transaction_type,
        description,
        metadata
    ) VALUES (
        NEW.id,
        50,
        60, -- 50 permanent + 10 daily
        'admin_grant',
        'Welcome bonus - 50 credits on signup',
        jsonb_build_object('reason', 'signup_bonus')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the reset_daily_credits function to give 10 daily credits
CREATE OR REPLACE FUNCTION reset_daily_credits(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_reset TIMESTAMP WITH TIME ZONE;
    hours_since_reset NUMERIC;
    v_daily_grant INTEGER;
BEGIN
    SELECT last_daily_reset INTO last_reset
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    hours_since_reset := EXTRACT(EPOCH FROM (NOW() - last_reset)) / 3600;
    
    -- Reset daily credits if 24 hours have passed
    IF hours_since_reset >= 24 THEN
        -- Default 10 daily credits, or subscription bonus if active
        v_daily_grant := CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.user_subscriptions 
                WHERE user_id = p_user_id AND status = 'active'
            ) THEN (
                SELECT COALESCE(cp.daily_credits_bonus, 10)
                FROM public.user_subscriptions us
                JOIN public.credit_packages cp ON us.package_id = cp.id
                WHERE us.user_id = p_user_id AND us.status = 'active'
                LIMIT 1
            )
            ELSE 10
        END;
        
        UPDATE public.user_credits
        SET daily_credits = v_daily_grant,
            last_daily_reset = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Log the daily grant transaction
        INSERT INTO public.credit_transactions (
            user_id,
            amount,
            balance_after,
            transaction_type,
            description,
            metadata
        ) VALUES (
            p_user_id,
            v_daily_grant,
            (SELECT daily_credits + permanent_credits FROM public.user_credits WHERE user_id = p_user_id),
            'daily_grant',
            'Daily credit grant',
            jsonb_build_object('credits_granted', v_daily_grant)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default credit costs (1 for text, 4 for image)
INSERT INTO public.credit_costs (operation_type, credits_required, description, is_active) VALUES
    ('text_generation', 1, 'Generate text prompts and refinements', true),
    ('image_generation', 4, 'Generate images from prompts', true)
ON CONFLICT (operation_type) DO UPDATE SET
    credits_required = EXCLUDED.credits_required,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Clear existing packages to avoid conflicts
DELETE FROM public.credit_packages WHERE package_type = 'subscription';

-- Insert subscription packages with proper queue priority features
INSERT INTO public.credit_packages (
    name,
    description,
    credits,
    price,
    package_type,
    stripe_price_id,
    interval,
    features,
    daily_credits_bonus,
    is_active,
    is_featured,
    sort_order
) VALUES
    (
        'Starter',
        'Perfect for getting started with AI prompt generation',
        300,
        9.99,
        'subscription',
        NULL, -- Will be updated with actual Stripe price ID
        'month',
        jsonb_build_array(
            '300 credits per month',
            'Core and premium models',
            'Prompt extraction + refinement',
            'Image generation',
            'Standard processing'
        ),
        10, -- Same as free tier daily credits
        true,
        false,
        1
    ),
    (
        'Creator',
        'Ideal for content creators and professionals',
        700,
        19.99,
        'subscription',
        NULL, -- Will be updated with actual Stripe price ID
        'month',
        jsonb_build_array(
            '700 credits per month',
            'All Starter features',
            'Priority processing in queue',
            'Faster generation times'
        ),
        15, -- Bonus daily credits
        true,
        true, -- Featured plan
        2
    ),
    (
        'Pro',
        'Maximum power for heavy users',
        2000,
        49.99,
        'subscription',
        NULL, -- Will be updated with actual Stripe price ID
        'month',
        jsonb_build_array(
            '2,000 credits per month',
            'All Creator features',
            'Highest priority in queue',
            'Fastest generation times',
            'Priority support'
        ),
        20, -- Maximum daily credits bonus
        true,
        false,
        3
    );

-- Add queue_priority column to credit_packages if it doesn't exist
ALTER TABLE public.credit_packages 
ADD COLUMN IF NOT EXISTS queue_priority INTEGER DEFAULT 0;

-- Update queue priorities for packages
UPDATE public.credit_packages 
SET queue_priority = CASE 
    WHEN name = 'Starter' THEN 1
    WHEN name = 'Creator' THEN 2
    WHEN name = 'Pro' THEN 3
    ELSE 0
END
WHERE package_type = 'subscription';

-- Create a function to get user's queue priority based on subscription
CREATE OR REPLACE FUNCTION get_user_queue_priority(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_priority INTEGER;
BEGIN
    SELECT COALESCE(cp.queue_priority, 0) INTO v_priority
    FROM public.user_subscriptions us
    JOIN public.credit_packages cp ON us.package_id = cp.id
    WHERE us.user_id = p_user_id 
    AND us.status = 'active'
    ORDER BY cp.queue_priority DESC
    LIMIT 1;
    
    RETURN COALESCE(v_priority, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing users to have the new credit amounts (optional, remove if not needed)
-- This will give all existing users the new signup bonus
UPDATE public.user_credits
SET permanent_credits = permanent_credits + 50,
    daily_credits = 10,
    updated_at = NOW()
WHERE permanent_credits < 50;

-- Log the credit adjustment for existing users
INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, description, metadata)
SELECT 
    user_id,
    50,
    daily_credits + permanent_credits,
    'admin_grant',
    'System update - adjusted to new credit system',
    jsonb_build_object('reason', 'system_migration')
FROM public.user_credits
WHERE permanent_credits >= 50; -- Only for users who just got the update