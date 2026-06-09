'use client';

import Link from 'next/link';
import { Gift, ArrowRight } from 'lucide-react';

export function CompetitionBanner() {
    return (
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white py-3 px-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                <Gift className="w-5 h-5 text-amber-300" />
                <span className="font-semibold text-sm md:text-base">
                    🎉 $1,000 Launch Giveaway! Enter now for your chance to win!
                </span>
                <Link
                    href="/competition-rules"
                    className="inline-flex items-center gap-1 text-sm md:text-base font-medium hover:underline transition-all hover:scale-105 text-amber-100"
                >
                    View Rules
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
