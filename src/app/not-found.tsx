'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { museoModerno } from '@/lib/fonts';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className={`text-8xl md:text-9xl font-bold mb-4 ${museoModerno.className} bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent`}>
          404
        </h1>
        
        <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${museoModerno.className}`}>
          Page Not Found
        </h2>
        
        <p className="text-gray-400 mb-12 text-lg">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}