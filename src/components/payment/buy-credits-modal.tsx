"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Check, Sparkles, AlertCircle, X, Zap, Gem } from "lucide-react";
import { orbitron } from "@/lib/fonts";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { analytics } from "@/lib/analytics/mixpanel";

interface CreditPack {
    name: string;
    price: string;
    packageId: string;
    description: string;
    credits: string;
    features: string[];
    icon: React.ReactNode;
    popular?: boolean;
    packageType: 'one_time';
}

interface BuyCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface BlobButtonProps {
    pack: CreditPack;
    index: number;
    loadingPack: string | null;
    onSelect: (pack: CreditPack) => void;
}

const BlobButton = ({ pack, index, loadingPack, onSelect }: BlobButtonProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const isYellow = index === 2; // Yellow autoplays

    const handleMouseEnter = () => {
        if (!isYellow && videoRef.current) {
            videoRef.current.play().catch(e => console.log('Play failed', e));
        }
    };

    const handleMouseLeave = () => {
        if (!isYellow && videoRef.current) {
            videoRef.current.pause();
        }
    };

    return (
        <button
            onClick={() => onSelect(pack)}
            disabled={!!loadingPack}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`transition-all active:translate-y-[2px] border-0 relative z-10 w-full max-w-[300px] aspect-[300/120] bg-transparent p-0 cursor-pointer flex justify-center items-center mx-auto mb-6 ${loadingPack === pack.packageId ? 'opacity-70 cursor-wait' : ''}`}
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
                        autoPlay={isYellow}
                        loop
                        muted
                        playsInline
                        disablePictureInPicture
                        preload="auto"
                        className="w-full h-full object-cover"
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
                <span className="relative z-20 text-white font-sans font-extrabold text-base tracking-widest uppercase">
                    {loadingPack === pack.packageId ? 'Processing...' : 'SELECT PLAN'}
                </span>
            </>
        </button>
    );
};

export function BuyCreditsModal({ isOpen, onClose }: BuyCreditsModalProps) {
    const { isSignedIn } = useAuth();
    const router = useRouter();
    const [loadingPack, setLoadingPack] = useState<string | null>(null);
    const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
    const [loadingPacks, setLoadingPacks] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchCreditPacks();
            analytics.trackPricingView();
        }
    }, [isOpen]);

    const fetchCreditPacks = async () => {
        try {
            setLoadingPacks(true);
            const response = await fetch('/api/credit-packages');
            if (response.ok) {
                const data = await response.json();
                const oneTimePacks = data.packages
                    .filter((pkg: any) => pkg.package_type === 'one_time' && pkg.is_active)
                    .sort((a: any, b: any) => a.sort_order - b.sort_order)
                    .map((pkg: any) => ({
                        name: pkg.name,
                        price: pkg.price.toString(),
                        packageId: pkg.id,
                        description: pkg.description || '',
                        credits: `${pkg.credits} credits`,
                        features: Array.isArray(pkg.features) ? pkg.features : [],
                        icon: <Sparkles className="w-5 h-5" />,
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

    const handleSelectPack = async (pack: CreditPack) => {
        analytics.trackPlanClick(pack.name, pack.price);

        if (!isSignedIn) {
            router.push('/sign-in?redirect=/dashboard?view=generate');
            return;
        }

        try {
            setLoadingPack(pack.packageId);
            analytics.trackCheckoutStarted(pack.name, pack.packageId, pack.price);

            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    packageId: pack.packageId,
                    packageType: 'one_time',
                }),
            });

            const data = await response.json();

            if (response.ok && data.sessionUrl) {
                window.location.href = data.sessionUrl;
            } else {
                console.error('Failed to create checkout session:', data.error);
                alert('Failed to start checkout. Please try again.');
                setLoadingPack(null);
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            alert('An error occurred. Please try again.');
            setLoadingPack(null);
        }
    };

    // Use a custom implementation similar to subscription-modal but compatible with existing modal system
    // Or reuse the Modal component if it fits. The SubscriptionModal uses a wrapper around Dialog.
    // Let's check how SubscriptionModal is implemented first. 
    // It imports Modal from "@/components/ui/modal". Let's stick to that for consistency.

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            className="max-w-[95vw] lg:max-w-7xl w-full !bg-[#050505] !border-white/10"
        >
            <div className="absolute inset-0 bg-black/40 -z-10" />

            {/* Custom Close Button to ensure it works */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>

            <div className="p-6 md:p-10 w-full mx-auto relative z-10 overflow-y-auto max-h-[85vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#050505] [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
                <div className="text-center mb-10 pt-4">
                    <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${orbitron.className} text-white tracking-wide`}>
                        TOP UP YOUR CREDITS
                    </h2>
                    <p className="text-gray-400 text-base md:text-lg">
                        Get access to premium generation power. Credits never expire.
                    </p>
                </div>

                {loadingPacks ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 pb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col h-full rounded-2xl bg-[#121212] border border-white/5 p-6 relative overflow-hidden mt-10">
                                {/* Header Skeleton */}
                                <div className="mb-2 pt-2 h-[80px]">
                                    <Skeleton className="h-8 w-3/4 bg-white/10 mb-2" />
                                    <Skeleton className="h-4 w-full bg-white/5 mb-1" />
                                    <Skeleton className="h-4 w-2/3 bg-white/5" />
                                </div>

                                {/* Price Skeleton */}
                                <div className="mb-6 flex items-baseline gap-1 h-[40px]">
                                    <Skeleton className="h-10 w-1/2 bg-white/10" />
                                </div>

                                {/* Button Skeleton (Blob Shape) */}
                                <div className="w-full max-w-[300px] aspect-[300/120] mx-auto mb-6 flex items-center justify-center">
                                    <Skeleton
                                        className="w-full h-full bg-white/5"
                                        style={{
                                            maskImage: "url('/assets/mask-shape.png')",
                                            WebkitMaskImage: "url('/assets/mask-shape.png')",
                                            maskSize: "100% 100%",
                                            WebkitMaskSize: "100% 100%",
                                            maskRepeat: "no-repeat",
                                            WebkitMaskRepeat: "no-repeat",
                                            maskPosition: "center",
                                            WebkitMaskPosition: "center"
                                        }}
                                    />
                                </div>

                                {/* Credits Info Skeleton */}
                                <div className="mb-6 pb-6 border-b border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Skeleton className="w-5 h-5 rounded-full bg-white/10" />
                                        <Skeleton className="h-6 w-1/3 bg-white/10" />
                                    </div>
                                    <Skeleton className="h-3 w-1/2 bg-white/5" />
                                </div>

                                {/* Features Skeleton */}
                                <div className="space-y-4 flex-1">
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j} className="flex items-start gap-3">
                                            <Skeleton className="w-4 h-4 rounded-full bg-white/5 flex-shrink-0" />
                                            <Skeleton className="h-4 w-full bg-white/5" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 pb-8">
                        {creditPacks.map((pack, index) => {
                            // Assign distinct colors based on index/value
                            // 0: Basic (Gray/White)
                            // 1: Starter (Yellow)
                            // 2: Pro (Orange)
                            // 3: Ultimate (Red)

                            let accentColor = "bg-white"; // default
                            let buttonClass = "";

                            if (index === 1) { // Orange - Quick Start
                                accentColor = "bg-[#FF7700]";
                                buttonClass = "bg-gradient-to-b from-[#FF9933] to-[#FF7700] hover:from-[#FFAD5C] hover:to-[#FF851A] text-black shadow-[0_4px_0_0_#B35200] hover:shadow-[0_4px_0_0_#994600] active:shadow-[0_2px_0_0_#B35200]";
                            } else if (index === 2) { // Yellow - Best Value
                                accentColor = "bg-[#F1E500]";
                                buttonClass = "bg-gradient-to-b from-[#f8f052] to-[#d4c800] hover:from-[#f9f262] hover:to-[#e0d400] text-black shadow-[0_4px_0_0_#8a8000] hover:shadow-[0_4px_0_0_#7a7000] active:shadow-[0_2px_0_0_#8a8000]";
                            } else if (index === 3) { // Red
                                accentColor = "bg-[#F11E1E]";
                                buttonClass = "bg-gradient-to-b from-[#FF4D4D] to-[#F11E1E] hover:from-[#FF6666] hover:to-[#FF3333] text-white shadow-[0_4px_0_0_#990000] hover:shadow-[0_4px_0_0_#800000] active:shadow-[0_2px_0_0_#990000]";
                            } else {
                                // Basic - White
                                buttonClass = "bg-white hover:bg-gray-100 text-black shadow-[0_4px_0_0_#9ca3af] hover:shadow-[0_4px_0_0_#6b7280] active:shadow-[0_2px_0_0_#9ca3af]";
                            }

                            return (
                                <div
                                    key={pack.packageId}
                                    className={`relative flex flex-col transition-all duration-300 ${pack.popular ? '' : 'mt-10'}`}
                                >
                                    {/* Outer Container (Accent for Popular, Transparent/Border for Normal) */}
                                    <div
                                        className={`flex flex-col h-full rounded-2xl ${pack.popular
                                            ? `${accentColor} shadow-2xl p-[2px] pt-8`
                                            : 'bg-[#121212] border border-white/5 hover:-translate-y-1'
                                            }`}
                                    >
                                        {/* Most Popular Label (Only for Popular) */}
                                        {pack.popular && (
                                            <div className="absolute top-2 left-0 right-0 flex items-center justify-center gap-2 h-6">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    {/* Main diamond shape */}
                                                    <path d="M6 3h12l4 6-10 12L2 9l4-6z" fill="black" stroke="black" strokeWidth="1.5" />
                                                    {/* White shine cutout */}
                                                    <path d="M7 5l2 3.5-1.5 2L5 8l2-3z" fill="white" opacity="0.9" />
                                                </svg>
                                                <span className={`text-black font-bold text-xs uppercase tracking-widest ${orbitron.className}`}>Best Value</span>
                                            </div>
                                        )}

                                        {/* Inner Card Body */}
                                        <div
                                            className={`flex-1 flex flex-col p-6 rounded-xl relative overflow-hidden ${pack.popular ? 'bg-[#121212]' : ''}`}
                                        >
                                            {/* Noise Texture */}
                                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                                            {/* Top Section - Fixed Height for Alignment */}
                                            <div className={`flex flex-col relative z-10`}>
                                                {/* Header */}
                                                <div className="mb-2 pt-2 h-[80px]">
                                                    <h3 className={`text-2xl font-bold text-white mb-2 ${orbitron.className}`}>
                                                        {pack.name}
                                                    </h3>
                                                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{pack.description}</p>
                                                </div>

                                                {/* Price */}
                                                <div className="mb-6 flex items-baseline gap-1 h-[40px]">
                                                    <span className={`text-4xl font-bold text-white tracking-tight`}>
                                                        ${pack.price}
                                                    </span>
                                                    <span className="text-gray-500 text-sm font-medium">one-time</span>
                                                </div>
                                            </div>

                                            {/* Selection Button */}
                                            {/* Selection Button */}
                                            {(index >= 0 && index <= 3) ? (
                                                <BlobButton
                                                    pack={pack}
                                                    index={index}
                                                    loadingPack={loadingPack}
                                                    onSelect={handleSelectPack}
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => handleSelectPack(pack)}
                                                    disabled={!!loadingPack}
                                                    className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider mb-6 whitespace-nowrap overflow-hidden ${buttonClass} ${loadingPack === pack.packageId ? 'opacity-70 cursor-wait' : ''} transition-all active:translate-y-[2px] border-0 relative z-10`}
                                                >
                                                    <span className="relative z-10">
                                                        {loadingPack === pack.packageId ? 'Processing...' : 'Select Plan'}
                                                    </span>
                                                </button>
                                            )}

                                            {/* Credits Info */}
                                            <div className="mb-6 pb-6 border-b border-white/10 relative z-10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap className={`w-5 h-5 ${index > 0 ? 'text-' + accentColor.replace('bg-', '') : 'text-white'}`} style={{ color: index === 1 ? '#FF7700' : index === 2 ? '#F1E500' : index === 3 ? '#F11E1E' : 'white' }} />
                                                    <span className="font-bold text-lg text-white">{pack.credits}</span>
                                                </div>
                                                <p className="text-xs text-gray-500">Never expires • Rolls over</p>
                                            </div>

                                            {/* Features List */}
                                            <div className="space-y-3 flex-1 pb-2 relative z-10">
                                                {pack.features.map((feature, i) => (
                                                    <div key={i} className="flex items-start gap-3">
                                                        <Check className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                                                        <span className="text-sm text-gray-400 leading-snug">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}


            </div>
        </Modal>
    );
}
