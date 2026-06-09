'use client';

import { useState, useEffect, useRef } from 'react';

import { Check, Sparkles, Zap } from 'lucide-react';
import { orbitron } from '@/lib/fonts';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { HomeSidebar } from '@/components/layout/home-sidebar';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { useSubscription } from '@/hooks/use-subscription';
import { analytics } from '@/lib/analytics/mixpanel';
import { Skeleton } from '@/components/ui/skeleton';

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
    name: 'Free',
    price: '0',
    packageId: 'free',
    description: 'Get started with AI image generation',
    credits: '30 credits / month',
    icon: <Zap className="w-5 h-5 text-white" />,
    packageType: 'subscription',
    features: [
      '30 credits / month',
      'DALL·E 3 — best prompt adherence',
      'Flux Kontext Pro — text-to-image',
      'OpenAI GPT-Image 1 — experimental',
      'Save generated content'
    ]
  },
  {
    name: 'Starter',
    price: '9.99',
    packageId: '3f326d04-f0a6-4bc0-b477-1aa2da37e182',
    description: 'Perfect for regular creators',
    credits: '300 credits / month',
    icon: <Zap className="w-5 h-5" style={{ color: '#FF7700' }} />,
    packageType: 'subscription',
    features: [
      '300 credits / month',
      'Everything in Free plus',
      'AI Image Editing — unlimited',
      'Stable Diffusion 3.5 Large',
      'Flux Schnell — ultra-fast'
    ]
  },
  {
    name: 'Creator',
    price: '19.99',
    packageId: 'd53622d2-ea71-4794-89fa-991a1fac5300',
    description: 'Ideal for content creators and professionals',
    credits: '700 credits / month',
    icon: <Zap className="w-5 h-5" style={{ color: '#F1E500' }} />,
    popular: true,
    packageType: 'subscription',
    features: [
      '700 credits / month',
      'Everything in Starter plus',
      'Flux Pro v1.1 — balanced',
      'Flux Realism LoRA',
      'Recraft v3 — artistic',
      'Priority processing'
    ]
  },
  {
    name: 'Pro',
    price: '49.99',
    packageId: 'ae35eee0-d5bf-4258-b749-94fda3b5f6b2',
    description: 'Maximum power for heavy users',
    credits: '2,000 credits / month',
    icon: <Zap className="w-5 h-5" style={{ color: '#F11E1E' }} />,
    packageType: 'subscription',
    features: [
      '2,000 credits / month',
      'Flux Pro Ultra — max quality',
      'Google Imagen 3 & 4 Ultra',
      'ByteDance Seededit 3.0',
      'Highest priority queue'
    ]
  }
];

interface BlobButtonProps {
  plan: PricingPlan;
  index: number;
  loadingPlan: string | null;
  text?: string;
  onClick: (plan: PricingPlan) => void;
  disabled?: boolean;
  className?: string; // Add className prop
}

// Update BlobButton to handle static/disabled state better
const BlobButton = ({ plan, index, loadingPlan, text, onClick, disabled, className, isStatic }: BlobButtonProps & { isStatic?: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Creator plan (index 2) autoplays in the reference design
  const isYellow = index === 2;

  const handleMouseEnter = () => {
    if (!isStatic && !isYellow && videoRef.current) {
      videoRef.current.play().catch(e => console.log('Play failed', e));
    }
  };

  const handleMouseLeave = () => {
    if (!isStatic && !isYellow && videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <button
      onClick={() => !disabled && onClick(plan)}
      disabled={disabled || !!loadingPlan}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`transition-all active:translate-y-[2px] border-0 relative z-10 w-full max-w-[300px] aspect-[300/120] bg-transparent p-0 flex justify-center items-center mx-auto ${loadingPlan === plan.packageId ? 'opacity-70 cursor-wait' : ''} ${disabled && !loadingPlan ? 'cursor-default' : 'cursor-pointer'} ${className || ''}`}
    >
      <>
        {/* LAYER 1: THE VIDEO (Bottom) */}
        <div
          className="absolute top-0 left-0 w-full h-full z-0"
          style={{
            maskImage: "url('/assets/mask-shape.png')",
            WebkitMaskImage: "url('/assets/mask-shape.png')",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        >
          <video
            ref={videoRef}
            autoPlay={isYellow && !isStatic}
            loop
            muted
            playsInline
            disablePictureInPicture
            preload="auto"
            className={`w-full h-full object-cover ${isStatic ? 'opacity-50' : ''}`}
            style={{ objectFit: 'cover' }}
          >
            <source
              src={
                index === 0 ? "/assets/credits-button-bg.webm" :
                  index === 1 ? "/assets/orange-button-bg.webm" :
                    index === 2 ? "/assets/yellow-button bg.webm" :
                      "/assets/red-button-bg.webm"
              }
              type="video/webm"
            />
          </video>
        </div>

        {/* LAYER 2: THE GLASS OVERLAY (Middle) */}
        <div
          className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
          style={{
            backgroundImage: index === 0 ? "url('/assets/glass-overlay.png')" : "url('/assets/new-mask.png')",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            transform: "scale(1.1) translateY(5px) translateX(-4px)",
          }}
        />

        {/* LAYER 3: THE TEXT (Top) */}
        <span className={`relative z-20 text-white text-base tracking-widest uppercase font-extrabold ${orbitron.className}`}>
          {loadingPlan === plan.packageId ? 'Processing' : text || 'Select Plan'}
        </span>
      </>
    </button>
  );
};

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');
  const [pricingType, setPricingType] = useState<'subscription' | 'one_time'>('subscription');
  const [creditPacks, setCreditPacks] = useState<PricingPlan[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pendingPlanChange, setPendingPlanChange] = useState<{
    from: string;
    to: string;
    toPackageId: string;
    isUpgrade: boolean;
  } | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  useEffect(() => {
    analytics.trackPricingView();
    fetchCreditPacks();
  }, []);

  const fetchCreditPacks = async () => {
    try {
      const response = await fetch('/api/credit-packages');
      if (response.ok) {
        const data = await response.json();
        const oneTimePacks = data.packages
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((pkg: any) => pkg.package_type === 'one_time' && pkg.is_active)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((pkg: any) => ({
            name: pkg.name,
            price: pkg.price.toString(),
            packageId: pkg.id,
            description: pkg.description || '',
            credits: `${pkg.credits} credits`,
            features: Array.isArray(pkg.features) ? pkg.features : [],
            icon: <Sparkles className="w-5 h-5" />, // Will be overridden by index logic
            popular: pkg.is_featured || false,
            packageType: 'one_time' as const
          }));
        setCreditPacks(oneTimePacks);
      }
    } catch (error) {
      console.error('Error fetching credit packs:', error);
    } finally {
      setLoadingPacks(false);
    }
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    analytics.trackPlanClick(plan.name, plan.price);

    if (plan.packageId === 'free') {
      if (!isSignedIn) {
        router.push('/sign-up');
      } else {
        router.push('/dashboard?view=generate');
      }
      return;
    }

    if (!isSignedIn) {
      router.push('/sign-in?redirect=/pricing');
      return;
    }

    try {
      setLoadingPlanId(plan.packageId);
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
      } else if (data.hasActiveSubscription) {
        const currentPrice = parseFloat(data.currentSubscription.packageName === 'Starter' ? '9.99' :
          data.currentSubscription.packageName === 'Creator' ? '19.99' : '49.99');
        const newPrice = parseFloat(plan.price);
        const isUpgrade = newPrice > currentPrice;

        setPendingPlanChange({
          from: data.currentSubscription.packageName,
          to: plan.name,
          toPackageId: plan.packageId,
          isUpgrade
        });
        setShowUpgradeModal(true);
        setLoadingPlanId(null);
      } else {
        console.error('Failed to create checkout session:', data);
        alert(`Failed to start checkout: ${data.error || 'Unknown error'}. Please try again.`);
        setLoadingPlanId(null);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setLoadingPlanId(null);
    }
  };

  const displayedPlans = pricingType === 'subscription' ? subscriptionPlans : creditPacks;

  return (
    <div className="min-h-screen bg-black text-white">
      <HomeSidebar onUnauthenticatedAction={(action) => {
        setSignInAction(action);
        setIsSignInModalOpen(true);
      }} />

      <div className="md:ml-20 pb-24 md:pb-8">

        {/* Pricing Section */}
        <div className="py-12">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-16">
              <h1 className={`text-4xl sm:text-5xl font-bold mb-4 uppercase tracking-widest ${orbitron.className}`}>
                {pricingType === 'subscription' ? 'Choose Your Plan' : 'Top Up Your Credits'}
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 mb-8 font-light">
                {pricingType === 'subscription'
                  ? 'Unlock the full power of AI generation with flexible plans.'
                  : 'Get access to premium generation power. Credits never expire.'}
              </p>

              {/* Toggle between Subscription and Credit Packs */}
              <div className="flex justify-center mb-12">
                <div className="inline-flex rounded-full bg-[#121212] border border-white/10 p-1.5 backdrop-blur-sm">
                  <button
                    onClick={() => setPricingType('subscription')}
                    className={`px-8 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${pricingType === 'subscription'
                      ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                      } ${orbitron.className}`}
                  >
                    SUBSCRIPTIONS
                  </button>
                  <button
                    onClick={() => setPricingType('one_time')}
                    className={`px-8 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${pricingType === 'one_time'
                      ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                      } ${orbitron.className}`}
                  >
                    CREDIT PACKS
                  </button>
                </div>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-8">
              {loadingPacks && pricingType === 'one_time' ? (
                // Loading Skeletons
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col h-full rounded-2xl bg-[#121212] border border-white/5 p-6 relative overflow-hidden mt-10">
                    <div className="mb-2 pt-2 h-[80px]">
                      <Skeleton className="h-8 w-3/4 bg-white/10 mb-2" />
                      <Skeleton className="h-4 w-full bg-white/5 mb-1" />
                    </div>
                    <div className="mb-6 h-[40px]">
                      <Skeleton className="h-10 w-1/2 bg-white/10" />
                    </div>
                    <div className="w-full max-w-[300px] aspect-[300/120] mx-auto mb-6">
                      <Skeleton className="w-full h-full rounded-full bg-white/5" />
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3].map(j => <Skeleton key={j} className="h-4 w-full bg-white/5" />)}
                    </div>
                  </div>
                ))
              ) : displayedPlans.length === 0 && pricingType === 'one_time' ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400">No credit packs available.</p>
                </div>
              ) : (
                displayedPlans.map((plan, index) => {
                  const isCurrentPlan = subscription?.package?.name === plan.name;
                  const isFreePlan = plan.packageId === 'free';
                  const isCurrentFreePlan = isFreePlan && !subscription;

                  // Determine colors based on index
                  // 0: Gray/Basic, 1: Orange, 2: Yellow (Popular), 3: Red
                  // Note: Credit packs fetched from API might not be exactly 4, but we map index % 4
                  // For consistent "Yellow is Popular/Creator", we rely on the order.
                  const colorIndex = index % 4;
                  let accentColor = "bg-white";
                  let borderColor = "border-white/5";
                  let textColor = "text-white";

                  if (colorIndex === 1) { // Starter (Orange)
                    accentColor = "bg-[#FF7700]";
                    textColor = "text-[#FF7700]";
                    borderColor = "border-[#FF7700]/30";
                  } else if (colorIndex === 2) { // Creator (Yellow)
                    accentColor = "bg-[#F1E500]";
                    textColor = "text-[#F1E500]";
                    borderColor = "border-[#F1E500]/50";
                  } else if (colorIndex === 3) { // Pro (Red)
                    accentColor = "bg-[#F11E1E]";
                    textColor = "text-[#F11E1E]";
                    borderColor = "border-[#F11E1E]/30";
                  }

                  // Popular plan gets stricter styling
                  if (plan.popular) {
                    borderColor = "border-[#F1E500]"; // Solid yellow border for popular
                  }

                  // Determine button text and state
                  let buttonText = "Select Plan";
                  if (plan.packageType === 'one_time') {
                    buttonText = "Buy Credits";
                  } else if (isFreePlan && !subscription) {
                    buttonText = "Get Started";
                  } else if (subscription) {
                    const currentPrice = subscription.package.price ? parseFloat(subscription.package.price.toString()) : 0;
                    const planPrice = parseFloat(plan.price);
                    // If plan is lower tier than current subscription
                    if (planPrice < currentPrice) {
                      buttonText = "Downgrade";
                    } else if (planPrice > currentPrice) {
                      buttonText = "Upgrade";
                    } else {
                      buttonText = "Current Plan";
                    }
                  }


                  return (
                    <div
                      key={plan.packageId}
                      className={`relative flex flex-col transition-all duration-300 ${plan.popular ? '' : 'mt-10'}`}
                    >
                      {/* Outer Container */}
                      <div
                        className={`flex flex-col h-full rounded-3xl ${plan.popular
                          ? `${accentColor} shadow-[0_0_40px_-10px_rgba(241,229,0,0.3)] p-[2px] pt-8`
                          : `bg-[#121212] border ${borderColor} hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-900/10`
                          }`}
                      >
                        {/* Best Value Label */}
                        {plan.popular && (
                          <div className="absolute top-2 left-0 right-0 flex items-center justify-center gap-2 h-6">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 3h12l4 6-10 12L2 9l4-6z" fill="black" stroke="black" strokeWidth="1.5" />
                              <path d="M7 5l2 3.5-1.5 2L5 8l2-3z" fill="white" opacity="0.9" />
                            </svg>
                            <span className={`text-black font-bold text-xs uppercase tracking-widest ${orbitron.className}`}>Best Value</span>
                          </div>
                        )}

                        {/* Inner Card Body */}
                        <div className={`flex-1 flex flex-col p-6 rounded-[22px] relative overflow-hidden bg-[#121212] ${plan.popular ? '' : ''}`}>
                          {/* Noise Texture */}
                          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                          <div className="relative z-10 flex flex-col h-full">
                            {/* Header */}
                            <div className="mb-2 pt-2 min-h-[80px]">
                              <h3 className={`text-2xl font-bold text-white mb-2 ${orbitron.className} tracking-wide`}>
                                {plan.name}
                              </h3>
                              <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{plan.description}</p>
                            </div>

                            {/* Price */}
                            <div className="mb-8 flex items-baseline gap-1 h-[40px]">
                              <span className={`text-4xl font-bold text-white tracking-tight ${orbitron.className}`}>
                                ${plan.price}
                              </span>
                              {plan.packageType === 'subscription' && plan.price !== '0' && (
                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">/mo</span>
                              )}
                              {plan.packageType === 'one_time' && (
                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">one-time</span>
                              )}
                            </div>

                            {/* Blob Button */}
                            <div className="mb-8 w-full">
                              <BlobButton
                                plan={plan}
                                index={colorIndex}
                                loadingPlan={loadingPlanId}
                                onClick={handleSelectPlan}
                                text={buttonText}
                                disabled={isCurrentPlan || isCurrentFreePlan}
                                isStatic={isCurrentPlan || isCurrentFreePlan}
                              />
                            </div>

                            {/* Credits Info */}
                            <div className="mb-6 pb-6 border-b border-white/10 relative z-10">
                              <div className="flex items-center gap-2 mb-2">
                                <Zap className={`w-5 h-5 ${colorIndex === 1 ? 'text-[#FF7700]' : colorIndex === 2 ? 'text-[#F1E500]' : colorIndex === 3 ? 'text-[#F11E1E]' : 'text-white'}`} fill="currentColor" />
                                <span className={`font-bold text-lg text-white ${orbitron.className}`}>{plan.credits}</span>
                              </div>
                              <p className="text-xs text-gray-500">Never expires • Rolls over</p>
                            </div>

                            {/* Features */}
                            <div className="space-y-3 flex-1">
                              {plan.features.map((feature, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <Check className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                                  <span className="text-sm text-gray-300 leading-snug font-light">{feature}</span>
                                </div>
                              ))}
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Upgrade/Downgrade Confirmation Modal */}
            {showUpgradeModal && pendingPlanChange && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-[#121212] border border-gray-800 rounded-2xl max-w-md w-full p-8 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                  <h3 className={`text-2xl font-bold mb-6 text-white ${orbitron.className}`}>
                    {pendingPlanChange.isUpgrade ? 'Upgrade' : 'Downgrade'} Subscription
                  </h3>
                  <p className="text-gray-300 mb-8 leading-relaxed">
                    You&apos;re currently on the <span className="font-bold text-white">{pendingPlanChange.from}</span> plan.
                    {pendingPlanChange.isUpgrade ? (
                      <>
                        <br /><br />
                        Upgrade to <span className="font-bold text-[#F1E500]">{pendingPlanChange.to}</span> to unlock more features and credits.
                        You&apos;ll be charged a prorated amount for the remainder of your billing period.
                      </>
                    ) : (
                      <>
                        <br /><br />
                        Downgrade to <span className="font-bold text-white">{pendingPlanChange.to}</span>?
                        Your new plan will take effect at the end of your current billing period.
                      </>
                    )}
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/stripe/change-subscription', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              newPackageId: pendingPlanChange.toPackageId,
                              isUpgrade: pendingPlanChange.isUpgrade
                            })
                          });

                          const data = await response.json();

                          if (response.ok) {
                            alert(`Successfully ${pendingPlanChange.isUpgrade ? 'upgraded' : 'downgraded'} your subscription!`);
                            window.location.reload();
                          } else {
                            alert(`Failed: ${data.error || 'Unknown error'}`);
                          }
                        } catch {
                          alert('An error occurred. Please try again.');
                        }
                        setShowUpgradeModal(false);
                      }}
                      className={`flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider transition-all ${orbitron.className}`}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setShowUpgradeModal(false);
                        setPendingPlanChange(null);
                      }}
                      className={`flex-1 bg-transparent hover:bg-white/5 border border-white/20 text-white py-3 rounded-xl font-bold uppercase tracking-wider transition-all ${orbitron.className}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <SignInModal
              isOpen={isSignInModalOpen}
              onClose={() => setIsSignInModalOpen(false)}
              action={signInAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}