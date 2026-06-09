'use client';

import { SignUp } from '@clerk/nextjs';
import { museoModerno } from '@/lib/fonts';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignUpContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold text-white ${museoModerno.className}`}>
            Join Prommmt
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Start sharing your AI art today
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary:
                'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
            },
          }}
          redirectUrl={redirectUrl ? decodeURIComponent(redirectUrl) : '/dashboard?view=generate'}
        />
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}