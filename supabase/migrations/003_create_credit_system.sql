-- Create user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    daily_credits INTEGER DEFAULT 5 CHECK (daily_credits >= 0),
    permanent_credits INTEGER DEFAULT 0 CHECK (permanent_credits >= 0),
    last_daily_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_lifetime_used INTEGER DEFAULT 0 CHECK (total_lifetime_used >= 0),
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_packages table
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL CHECK (credits > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    package_type VARCHAR(20) NOT NULL CHECK (package_type IN ('one_time', 'subscription')),
    stripe_price_id VARCHAR(255) UNIQUE,
    interval VARCHAR(20), -- 'month', 'year' for subscriptions
    features JSONB DEFAULT '[]',
    daily_credits_bonus INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.credit_packages(id),
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, status) -- Only one active subscription per user
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (
        transaction_type IN ('purchase', 'usage', 'daily_grant', 'referral_bonus', 'admin_grant', 'subscription_renewal', 'refund')
    ),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    stripe_payment_intent_id VARCHAR(255),
    related_id UUID, -- Can reference image_id, referral_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    referrer_bonus_paid BOOLEAN DEFAULT false,
    referred_bonus_paid BOOLEAN DEFAULT false,
    referrer_credits_earned INTEGER DEFAULT 50,
    referred_credits_earned INTEGER DEFAULT 25,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referred_id) -- Each user can only be referred once
);

-- Create admin_credit_grants table
CREATE TABLE IF NOT EXISTS public.admin_credit_grants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES public.users(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    amount INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL CHECK (
        reason IN ('customer_service', 'promotion', 'bug_compensation', 'contest_prize', 'other')
    ),
    notes TEXT,
    transaction_id UUID REFERENCES public.credit_transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stripe_webhooks table for debugging
CREATE TABLE IF NOT EXISTS public.stripe_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Create credit operation costs table
CREATE TABLE IF NOT EXISTS public.credit_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type VARCHAR(100) NOT NULL UNIQUE,
    credits_required INTEGER NOT NULL CHECK (credits_required > 0),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- Create indexes for better performance
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_user_credits_referral_code ON public.user_credits(referral_code);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_stripe_webhooks_event_id ON public.stripe_webhooks(stripe_event_id);
CREATE INDEX idx_stripe_webhooks_processed ON public.stripe_webhooks(processed);

-- Enable RLS on all tables
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits" 
    ON public.user_credits FOR SELECT 
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can manage user credits" 
    ON public.user_credits FOR ALL 
    USING (true);

-- RLS Policies for credit_packages (public read)
CREATE POLICY "Anyone can view active packages" 
    ON public.credit_packages FOR SELECT 
    USING (is_active = true);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions" 
    ON public.user_subscriptions FOR SELECT 
    USING (auth.uid()::text = user_id::text);

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions" 
    ON public.credit_transactions FOR SELECT 
    USING (auth.uid()::text = user_id::text);

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals" 
    ON public.referrals FOR SELECT 
    USING (auth.uid()::text = referrer_id::text OR auth.uid()::text = referred_id::text);

-- RLS Policies for credit_costs (public read)
CREATE POLICY "Anyone can view credit costs" 
    ON public.credit_costs FOR SELECT 
    USING (is_active = true);

-- Function to initialize user credits on signup
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code VARCHAR(50);
BEGIN
    -- Generate unique referral code (can be customized)
    new_referral_code := LOWER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
    
    INSERT INTO public.user_credits (
        user_id,
        daily_credits,
        permanent_credits,
        referral_code,
        last_daily_reset
    ) VALUES (
        NEW.id,
        5, -- Starting daily credits
        0, -- No permanent credits initially
        new_referral_code,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize credits for new users
CREATE TRIGGER initialize_user_credits_trigger
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();

-- Function to reset daily credits
CREATE OR REPLACE FUNCTION reset_daily_credits(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_reset TIMESTAMP WITH TIME ZONE;
    hours_since_reset NUMERIC;
BEGIN
    SELECT last_daily_reset INTO last_reset
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    hours_since_reset := EXTRACT(EPOCH FROM (NOW() - last_reset)) / 3600;
    
    IF hours_since_reset >= 24 THEN
        UPDATE public.user_credits
        SET daily_credits = CASE 
                WHEN EXISTS (
                    SELECT 1 FROM public.user_subscriptions 
                    WHERE user_id = p_user_id AND status = 'active'
                ) THEN (
                    SELECT COALESCE(cp.daily_credits_bonus, 5)
                    FROM public.user_subscriptions us
                    JOIN public.credit_packages cp ON us.package_id = cp.id
                    WHERE us.user_id = p_user_id AND us.status = 'active'
                    LIMIT 1
                )
                ELSE 5
            END,
            last_daily_reset = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume credits
CREATE OR REPLACE FUNCTION consume_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_operation_type VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    v_daily_credits INTEGER;
    v_permanent_credits INTEGER;
    v_daily_used INTEGER := 0;
    v_permanent_used INTEGER := 0;
    v_total_available INTEGER;
    v_balance_after INTEGER;
BEGIN
    -- First, try to reset daily credits if needed
    PERFORM reset_daily_credits(p_user_id);
    
    -- Get current balances
    SELECT daily_credits, permanent_credits
    INTO v_daily_credits, v_permanent_credits
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    v_total_available := v_daily_credits + v_permanent_credits;
    
    -- Check if user has enough credits
    IF v_total_available < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'available', v_total_available,
            'required', p_amount
        );
    END IF;
    
    -- Consume daily credits first
    IF v_daily_credits > 0 THEN
        v_daily_used := LEAST(v_daily_credits, p_amount);
        v_permanent_used := p_amount - v_daily_used;
    ELSE
        v_permanent_used := p_amount;
    END IF;
    
    -- Update balances
    UPDATE public.user_credits
    SET daily_credits = daily_credits - v_daily_used,
        permanent_credits = permanent_credits - v_permanent_used,
        total_lifetime_used = total_lifetime_used + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    v_balance_after := (v_daily_credits - v_daily_used) + (v_permanent_credits - v_permanent_used);
    
    -- Log transaction
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        transaction_type,
        description,
        metadata
    ) VALUES (
        p_user_id,
        -p_amount,
        v_balance_after,
        'usage',
        COALESCE(p_description, 'Credit consumption for ' || p_operation_type),
        p_metadata || jsonb_build_object(
            'operation_type', p_operation_type,
            'daily_used', v_daily_used,
            'permanent_used', v_permanent_used
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'credits_used', p_amount,
        'daily_used', v_daily_used,
        'permanent_used', v_permanent_used,
        'balance_after', v_balance_after
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
    v_balance_after INTEGER;
BEGIN
    -- Add to permanent credits
    UPDATE public.user_credits
    SET permanent_credits = permanent_credits + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING permanent_credits + daily_credits INTO v_balance_after;
    
    -- Log transaction
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        transaction_type,
        description,
        metadata
    ) VALUES (
        p_user_id,
        p_amount,
        v_balance_after,
        p_transaction_type,
        p_description,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral completion
CREATE OR REPLACE FUNCTION complete_referral(p_referred_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_referral RECORD;
BEGIN
    -- Find pending referral for this user
    SELECT * INTO v_referral
    FROM public.referrals
    WHERE referred_id = p_referred_user_id
    AND status = 'pending'
    LIMIT 1;
    
    IF v_referral.id IS NOT NULL THEN
        -- Update referral status
        UPDATE public.referrals
        SET status = 'completed',
            completed_at = NOW(),
            referrer_bonus_paid = true,
            referred_bonus_paid = true
        WHERE id = v_referral.id;
        
        -- Add credits to referrer
        PERFORM add_credits(
            v_referral.referrer_id,
            v_referral.referrer_credits_earned,
            'referral_bonus',
            'Referral bonus for inviting a new user',
            jsonb_build_object('referral_id', v_referral.id, 'referred_user_id', p_referred_user_id)
        );
        
        -- Add credits to referred user
        PERFORM add_credits(
            p_referred_user_id,
            v_referral.referred_credits_earned,
            'referral_bonus',
            'Welcome bonus for joining via referral',
            jsonb_build_object('referral_id', v_referral.id, 'referrer_user_id', v_referral.referrer_id)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check credit balance
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_credits RECORD;
BEGIN
    -- Reset daily credits if needed
    PERFORM reset_daily_credits(p_user_id);
    
    SELECT * INTO v_credits
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
        'daily_credits', v_credits.daily_credits,
        'permanent_credits', v_credits.permanent_credits,
        'total_available', v_credits.daily_credits + v_credits.permanent_credits,
        'total_lifetime_used', v_credits.total_lifetime_used,
        'referral_code', v_credits.referral_code,
        'last_daily_reset', v_credits.last_daily_reset
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;