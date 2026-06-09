"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Check, Zap, Star, Crown, Sparkles, CheckCircle } from "lucide-react";
import { museoModerno } from "@/lib/fonts";
import { Modal } from "@/components/ui/modal";
import { useSubscription } from "@/hooks/use-subscription";
import { analytics } from "@/lib/analytics/mixpanel";

interface PricingPlan {
    name: string;
    price: string;
    packageId: string;
    description: string;
    credits: string;
    features: string[];
    icon: React.ReactNode;
    popular?: boolean;
    packageType?: 'one_time' | 'subscription';
}

const subscriptionPlans: PricingPlan[] = [
    {
        name: 'Starter',
        price: '9.99',
        packageId: '3f326d04-f0a6-4bc0-b477-1aa2da37e182',
        description: 'Perfect for regular creators',
        credits: '300 credits / month',
        icon: <Star className="w-5 h-5" />,
        packageType: 'subscription',
        features: [
            '300 credits / month',
            'Everything in Free plus',
            'AI Image Editing',
            'Stable Diffusion 3.5 Large'
        ]
    },
    {
        name: 'Creator',
        price: '19.99',
        packageId: 'd53622d2-ea71-4794-89fa-991a1fac5300',
        description: 'Ideal for content creators',
        credits: '700 credits / month',
        icon: <Star className="w-5 h-5" />,
        popular: true,
        packageType: 'subscription',
        features: [
            '700 credits / month',
            'Everything in Starter plus',
            'Flux Pro v1.1',
            'Recraft v3',
            'ByteDance Seedream 3.0',
            'Priority processing'
        ]
    },
    {
        name: 'Pro',
        price: '49.99',
        packageId: 'ae35eee0-d5bf-4258-b749-94fda3b5f6b2',
        description: 'Maximum power for heavy users',
        credits: '2,000 credits / month',
        icon: <Crown className="w-5 h-5" />,
        packageType: 'subscription',
        features: [
            '2,000 credits / month',
            'Everything in Creator plus',
            'Flux Pro Ultra',
            'Google Imagen 3',
            'Highest priority queue'
        ]
    }
];

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    requiredTier?: string;
}

export function SubscriptionModal({ isOpen, onClose, requiredTier }: SubscriptionModalProps) {
    const { isSignedIn } = useAuth();
    const { subscription, loading: subscriptionLoading } = useSubscription();
    const router = useRouter();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            analytics.trackPricingView();
        }
    }, [isOpen]);

    const handleSelectPlan = async (plan: PricingPlan) => {
        analytics.trackPlanClick(plan.name, plan.price);

        if (!isSignedIn) {
            router.push('/sign-in?redirect=/dashboard?view=generate');
            return;
        }

        try {
            setLoadingPlan(plan.packageId);
            analytics.trackCheckoutStarted(plan.name, plan.packageId, plan.price);

            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    packageId: plan.packageId,
                    packageType: plan.packageType || 'subscription',
                }),
            });

            const data = await response.json();

            if (response.ok && data.sessionUrl) {
                window.location.href = data.sessionUrl;
            } else {
                console.error('Failed to create checkout session:', data.error);
                alert('Failed to start checkout. Please try again.');
                setLoadingPlan(null);
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            alert('An error occurred. Please try again.');
            setLoadingPlan(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Upgrade to Unlock">
            <div className="p-4 sm:p-6 max-w-5xl mx-auto">
                <div className="text-center mb-8">
                    <p className="text-gray-400 mb-2">
                        {requiredTier
                            ? `This model requires the ${requiredTier} plan or higher.`
                            : "Unlock premium models and features."}
                    </p>
                    <h2 className={`text-2xl font-bold ${museoModerno.className}`}>
                        Choose Your Plan
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {subscriptionPlans.map((plan) => {
                        const isCurrentPlan = subscription?.package?.name === plan.name;
                        return (
                            <div key={plan.packageId} className={`relative rounded-xl p-4 border flex flex-col ${plan.popular
                                ? 'bg-purple-900/10 border-purple-500/50'
                                : 'bg-gray-900/50 border-gray-800'
                                }`}>
                                {plan.popular && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">
                                        Most Popular
                                    </span>
                                )}

                                <div className="flex items-center gap-2 mb-2">
                                    <span className={plan.popular ? 'text-purple-400' : 'text-gray-400'}>
                                        {plan.icon}
                                    </span>
                                    <h3 className="font-bold">{plan.name}</h3>
                                </div>

                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-2xl font-bold">${plan.price}</span>
                                    <span className="text-xs text-gray-500">/mo</span>
                                </div>

                                <p className="text-xs text-purple-400 font-semibold mb-3">{plan.credits}</p>

                                <div className="space-y-1.5 mb-4 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-1.5">
                                            <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-xs text-gray-300 leading-tight">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleSelectPlan(plan)}
                                    disabled={isCurrentPlan || !!loadingPlan}
                                    className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${isCurrentPlan
                                        ? 'bg-green-600/20 text-green-500 cursor-default'
                                        : plan.popular
                                            ? 'bg-gradient-to-r from-[#FF7700] via-[#F1E500] to-[#F11E1E] text-black hover:opacity-90'
                                            : 'bg-white text-black hover:bg-gray-200'
                                        }`}
                                >
                                    {loadingPlan === plan.packageId ? 'Loading...' : isCurrentPlan ? 'Current Plan' : 'Subscribe'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 text-center">
                    <button onClick={onClose} className="text-sm text-gray-500 hover:text-white">
                        No thanks, I'll stick with my current plan
                    </button>
                </div>
            </div>
        </Modal>
    );
}
