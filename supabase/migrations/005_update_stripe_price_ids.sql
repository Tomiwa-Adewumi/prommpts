-- Update credit packages with actual Stripe price IDs from manually created products
-- These are the price IDs from your Stripe Dashboard

UPDATE public.credit_packages 
SET stripe_price_id = 'price_1RwA3HQ2cu5jH6nPMA0Z2aml'
WHERE name = 'Starter' AND package_type = 'subscription';

UPDATE public.credit_packages 
SET stripe_price_id = 'price_1RwA4UQ2cu5jH6nPnnrbL9xR'
WHERE name = 'Creator' AND package_type = 'subscription';

UPDATE public.credit_packages 
SET stripe_price_id = 'price_1RwA5UQ2cu5jH6nPxq5lCPwZ'
WHERE name = 'Pro' AND package_type = 'subscription';

-- Verify the updates
SELECT 
    name, 
    credits, 
    price, 
    stripe_price_id,
    queue_priority,
    features
FROM public.credit_packages 
WHERE package_type = 'subscription'
ORDER BY sort_order;