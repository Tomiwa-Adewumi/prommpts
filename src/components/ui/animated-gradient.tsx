"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientProps {
  className?: string;
}

export const AnimatedGradient: React.FC<AnimatedGradientProps> = ({ className }) => {
  return (
    <div className={cn("absolute inset-0 w-full h-full overflow-hidden bg-black", className)}>
      <div className="absolute inset-0 w-full h-full filter blur-[60px] opacity-80">
        {/* Blob 1 - Yellow - Increased size to cover more area */}
        <div
          className="absolute w-[150%] h-[150%] -top-[25%] -left-[25%] rounded-full opacity-70 mix-blend-screen animate-blob"
          style={{
            background: "radial-gradient(circle, #F1E500 0%, rgba(241, 229, 0, 0) 60%)",
          }}
        />

        {/* Blob 2 - Orange - Increased size */}
        <div
          className="absolute w-[150%] h-[150%] top-[0%] -right-[25%] rounded-full opacity-70 mix-blend-screen animate-blob animation-delay-2000"
          style={{
            background: "radial-gradient(circle, #FF7700 0%, rgba(255, 119, 0, 0) 60%)",
          }}
        />

        {/* Blob 3 - Red - Increased size */}
        <div
          className="absolute w-[150%] h-[150%] -bottom-[25%] left-[0%] rounded-full opacity-70 mix-blend-screen animate-blob animation-delay-4000"
          style={{
            background: "radial-gradient(circle, #F11E1E 0%, rgba(241, 30, 30, 0) 60%)",
          }}
        />
      </div>

      {/* Grain/Noise Overlay */}
      <div className="absolute inset-0 opacity-50 pointer-events-none mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.7"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* Overlay to darken slightly if needed for text contrast */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.05);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.95);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 8s infinite ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 2.5s;
        }
        .animation-delay-4000 {
          animation-delay: 5s;
        }
      `}</style>
    </div>
  );
};
