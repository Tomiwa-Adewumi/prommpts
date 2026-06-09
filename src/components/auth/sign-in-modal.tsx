'use client';

import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { LogIn, Heart, Eye, Bookmark } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: 'view' | 'like' | 'save';
  destinationUrl?: string;
}

export function SignInModal({ isOpen, onClose, action = 'view', destinationUrl }: SignInModalProps) {
  const getActionText = () => {
    switch (action) {
      case 'like':
        return 'like images';
      case 'save':
        return 'save images to favorites';
      case 'view':
      default:
        return 'see the prompts';
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'like':
        return <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />;
      case 'save':
        return <Bookmark className="w-12 h-12 text-yellow-500 mx-auto mb-4" />;
      case 'view':
      default:
        return <Eye className="w-12 h-12 text-blue-500 mx-auto mb-4" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md mx-4">
      <div className="p-8 text-center">
        {getActionIcon()}
        
        <h2 className="text-2xl font-bold text-white mb-3">
          Sign in required
        </h2>
        
        <p className="text-gray-300 mb-6 leading-relaxed">
          Sign in to {getActionText()} and unlock the full Prommmt experience.
        </p>
        
        <div className="space-y-3">
          <Button asChild className="w-full bg-white text-black hover:bg-gray-200">
            <Link href={destinationUrl ? `/sign-in?redirect=${encodeURIComponent(destinationUrl)}` : '/sign-in'}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Link>
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="w-full text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Maybe Later
          </Button>
        </div>
        
        <p className="text-sm text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link href="/sign-up" className="text-white hover:underline">
            Sign up for free
          </Link>
        </p>
      </div>
    </Modal>
  );
}