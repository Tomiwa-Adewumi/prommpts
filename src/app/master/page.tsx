'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HomeSidebar } from '@/components/layout/home-sidebar';
import { museoModerno } from '@/lib/fonts';
import { ArrowLeft } from 'lucide-react';

export default function MasterPage() {
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
    const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');

    const courses = [
        {
            id: 1,
            title: 'AI Creative Director Mastery',
            description: 'Master AI, build viral campaigns, and secure your first paid client fast.',
            price: '$599',
            originalPrice: '$1,999',
            icon: '/graduation-cap.png',
            buttonText: 'Claim Your Spot',
            url: 'https://stan.store/tumifnx/p/ai-creative-director-mastery',
            priority: 1
        },
        // {
        //     id: 2,
        //     title: 'AI Creative Director Intensive (1:1)',
        //     description: 'Exclusive one-on-one coaching to secure clients, build campaigns, and go viral.',
        //     price: '$999',
        //     originalPrice: '$2,999',
        //     icon: '/brain-gear.png',
        //     buttonText: 'Book Your 1:1 Spot',
        //     priority: 2
        // },
        {
            id: 2,
            title: 'Master Prompt Guide',
            description: 'Build master prompts for hyper-realistic AI visuals with handpicked examples + 10 photo tricks.',
            price: '$39',
            originalPrice: '$69',
            icon: '/briefcase.png',
            buttonText: 'Unlock Master Prompts',
            url: 'https://stan.store/tumifnx/p/master-prompt-guide',
            priority: 2
        },
        {
            id: 3,
            title: 'The AI Creative Starter Kit (Free)',
            description: '50+ premium prompts and 10+ Guides covering UGC, campaigns, product shots & more.',
            price: 'FREE',
            originalPrice: '$399',
            icon: '/gift-box.png',
            buttonText: 'Claim Free Starter Kit',
            url: 'https://stan.store/tumifnx/p/the-ai-creative-starter-kit-free',
            priority: 3
        }
    ];

    // Sort courses by priority
    const sortedCourses = courses.sort((a, b) => a.priority - b.priority);

    return (
        <div className="min-h-screen bg-black text-white">
            <HomeSidebar onUnauthenticatedAction={(action, destinationUrl) => {
                setSignInAction(action);
                setIsSignInModalOpen(true);
            }} />

            <div className="md:ml-20 pb-24 md:pb-8">

                {/* Header Section */}
                <header className="pt-8 md:pt-12 pb-8 md:pb-8">
                    <div className="px-6">
                        <div className="max-w-4xl mx-auto text-center">
                            <h1 className={`text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-gray-100 ${museoModerno.className}`}>
                                Become a Master
                            </h1>

                            {/* subtle accent underline */}
                            <div className="mt-3 flex justify-center">
                                <span className="h-1 w-24 md:w-32 lg:w-40 rounded-full bg-gradient-to-r from-indigo-400/70 via-blue-400/70 to-cyan-400/70" />
                            </div>

                            <p className="mt-6 text-lg md:text-2xl lg:text-3xl xl:text-4xl text-gray-300 leading-relaxed">
                                Master the skills and systems to lead AI-driven creative work and turn your results into revenue.
                            </p>
                        </div>
                    </div>
                </header>

                {/* Course Cards Section - New padding: 0px, 20px, 20px */}
                <div className="px-5 pt-0 pb-5">
                    <div className="max-w-2xl mx-auto">
                        <div className="space-y-6">
                            {sortedCourses.map((course, index) => (
                                <div key={course.id} className="relative">
                                    {/* Course Card */}
                                    <div className="bg-black border border-gray-700 rounded-xl p-3 shadow-lg">
                                        <div className="flex gap-1 items-start">
                                            {/* Left Column - Course Number */}
                                            <div className="flex-shrink-0">
                                                <div className="w-20 h-20 md:w-30 md:h-30 rounded-lg overflow-hidden flex items-center justify-center">
                                                    <img src={course.icon} alt={course.title} className="w-full h-full object-cover scale-125" />
                                                </div>
                                            </div>

                                            {/* Right Column - Content */}
                                            <div className="flex-1 min-w-0 flex-shrink">
                                                {/* Title */}
                                                <h3 className={`text-lg md:text-xl lg:text-2xl font-bold text-white leading-tight whitespace-nowrap mb-1 ${museoModerno.className}`}>
                                                    {course.title}
                                                </h3>

                                                {/* Description */}
                                                <p className="text-gray-500 text-sm md:text-base lg:text-lg leading-tight font-inter mb-1">
                                                    {course.description}
                                                </p>

                                                {/* Pricing */}
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-lg md:text-xl lg:text-2xl font-bold text-white ${museoModerno.className}`}>
                                                        {course.price}
                                                    </span>
                                                    {course.originalPrice && (
                                                        <span className={`text-lg md:text-xl lg:text-2xl line-through ${museoModerno.className}`} style={{ color: '#ffffff88' }}>
                                                            {course.originalPrice}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* CTA Button */}
                                        <div className="mt-1">
                                            <Button
                                                className="w-full bg-white text-black hover:bg-gray-200 py-3 text-base rounded-sm uppercase" asChild>
                                                <Link href={course.url} className="w-full block" target="_blank" rel="noopener noreferrer">
                                                    {course.buttonText}
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
