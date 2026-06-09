import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';

interface CreditPackage {
    id: string;
    name: string;
    description: string;
    credits: number;
    price: number;
    package_type: string;
}

interface UserSubscription {
    id: string;
    user_id: string;
    package_id: string;
    stripe_subscription_id: string;
    stripe_customer_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    created_at: string;
    updated_at: string;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    package: CreditPackage;
}

interface UseSubscriptionReturn {
    subscription: UserSubscription | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useSubscription(): UseSubscriptionReturn {
    const { isSignedIn } = useAuth();
    const [subscription, setSubscription] = useState<UserSubscription | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscription = useCallback(async () => {
        if (!isSignedIn) {
            setSubscription(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/user/subscription');
            if (response.ok) {
                const data = await response.json();
                setSubscription(data.subscription);
            } else {
                setError('Failed to fetch subscription');
            }
        } catch (err) {
            setError('Error fetching subscription');
        } finally {
            setLoading(false);
        }
    }, [isSignedIn]);

    useEffect(() => {
        fetchSubscription();
    }, [isSignedIn]);

    return {
        subscription,
        loading,
        error,
        refetch: fetchSubscription,
    };
}
