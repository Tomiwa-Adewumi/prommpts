'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { HomeSidebar } from '@/components/layout/home-sidebar';
import { SignInModal } from '@/components/auth/sign-in-modal';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { User, Mail, Calendar, Save, CreditCard, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

const profileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  fullName: z.string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be less than 255 characters'),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { supabaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [signInAction, setSignInAction] = useState<'view' | 'like' | 'save'>('view');
  const [signInDestination, setSignInDestination] = useState<string | undefined>(undefined);
  const [subscription, setSubscription] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Set initial values when user data loads
  useEffect(() => {
    if (supabaseUser) {
      setValue('username', supabaseUser.username || '');
      setValue('fullName', supabaseUser.full_name || '');
      setValue('bio', supabaseUser.bio || '');
    }
  }, [supabaseUser, setValue]);

  // Fetch subscription and credit data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch credits
        const creditsResponse = await fetch('/api/user/credits');
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setCredits(creditsData);
        }

        // Fetch subscription info
        const subResponse = await fetch('/api/user/subscription');
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscription(subData.subscription);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    if (supabaseUser) {
      fetchUserData();
    }
  }, [supabaseUser]);

  // Function to refresh subscription data
  const refreshSubscriptionData = async () => {
    try {
      const subResponse = await fetch('/api/user/subscription');
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }
    } catch (error) {
      console.error('Error refreshing subscription data:', error);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelingSubscription(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({
          type: 'success',
          text: result.message || 'Subscription canceled successfully!'
        });

        // Refresh subscription data to get the latest state
        await refreshSubscriptionData();

        setIsCancelModalOpen(false);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to cancel subscription' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred while canceling subscription' });
    } finally {
      setCancelingSubscription(false);
    }
  };

  if (!supabaseUser) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black text-white">
          <HomeSidebar onUnauthenticatedAction={(action, destinationUrl) => {
            setSignInAction(action);
            setSignInDestination(destinationUrl);
            setIsSignInModalOpen(true);
          }} />
          <div className="ml-20 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-white">
        <HomeSidebar onUnauthenticatedAction={(action, destinationUrl) => {
          setSignInAction(action);
          setSignInDestination(destinationUrl);
          setIsSignInModalOpen(true);
        }} />
        <div className="md:ml-20 pb-24 md:pb-8 p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white font-[var(--font-orbitron)]">Profile Settings</h1>
              <p className="text-gray-400 mt-1">
                Manage your profile, subscription, and account preferences
              </p>
            </div>

            {/* Profile Picture */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Profile Picture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={supabaseUser.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {supabaseUser.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">
                      Your profile picture is managed through your authentication provider.
                    </p>
                    <Button variant="outline" size="sm" disabled className="border-gray-600 text-gray-400">
                      Change Picture
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Username */}
                  <div>
                    <Label htmlFor="username" className="text-white">Username</Label>
                    <Input
                      id="username"
                      {...register('username')}
                      placeholder="Enter your username"
                      className={`bg-gray-800 border-gray-700 text-white ${errors.username ? 'border-red-500' : ''}`}
                    />
                    {errors.username && (
                      <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                      Your unique username visible to other users when viewing your content.
                    </p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <Label htmlFor="fullName" className="text-white">Full Name</Label>
                    <Input
                      id="fullName"
                      {...register('fullName')}
                      placeholder="Enter your full name"
                      className={`bg-gray-800 border-gray-700 text-white ${errors.fullName ? 'border-red-500' : ''}`}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-red-600 mt-1">{errors.fullName.message}</p>
                    )}
                  </div>

                  {/* Bio */}
                  <div>
                    <Label htmlFor="bio" className="text-white">Bio</Label>
                    <Textarea
                      id="bio"
                      {...register('bio')}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className={`bg-gray-800 border-gray-700 text-white ${errors.bio ? 'border-red-500' : ''}`}
                    />
                    {errors.bio && (
                      <p className="text-sm text-red-600 mt-1">{errors.bio.message}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                      Share a bit about yourself, your creative style, or what inspires your AI art (optional).
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading || !isDirty}
                    className="w-full sm:w-auto bg-white text-black hover:bg-gray-200"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>

                  {/* Success/Error Message */}
                  {message && (
                    <div className={`p-3 rounded-md ${message.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                      {message.text}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Subscription & Credits */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Subscription & Credits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Current Plan</p>
                    <p className="text-sm text-gray-400">
                      {subscription?.package?.name || 'Free Plan'}
                    </p>
                    {subscription?.cancel_at_period_end && (
                      <p className="text-xs text-yellow-400 mt-1">
                        Canceling on {subscription.current_period_end
                          ? new Date(subscription.current_period_end).toLocaleDateString()
                          : 'end of period'
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {subscription?.status === 'active' && !subscription?.cancel_at_period_end && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCancelModalOpen(true)}
                        className="bg-red-800 text-white border-red-800 hover:bg-red-900"
                      >
                        Cancel
                      </Button>
                    )}
                    <Link href="/pricing">
                      <Button variant="ghost" size="sm" className="text-gray-300 hover:bg-gray-800 hover:text-white">
                        Manage Plan
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {credits && (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Available Credits</p>
                      <p className="text-sm text-gray-400">
                        {credits.balance?.total_available || 0} credits
                      </p>
                    </div>
                  </div>
                )}

                {subscription?.status === 'active' && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {subscription?.cancel_at_period_end ? 'Access Until' : 'Next Billing'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {subscription.current_period_end
                          ? new Date(subscription.current_period_end).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Email</p>
                    <p className="text-sm text-gray-400">{supabaseUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Member Since</p>
                    <p className="text-sm text-gray-400">
                      {new Date(supabaseUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Account Type</p>
                    <p className="text-sm text-gray-400">
                      {supabaseUser.is_admin ? 'Administrator' : 'User'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sign In Modal */}
        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
          action={signInAction}
          destinationUrl={signInDestination}
        />

        {/* Cancel Subscription Confirmation Modal */}
        <ConfirmationModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelSubscription}
          title="Cancel Subscription"
          message={`Are you sure you want to cancel your ${subscription?.package?.name || 'subscription'}? You'll continue to have access to all features until ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'the end of your current billing period'}.`}
          confirmText="Yes, Cancel"
          cancelText="Keep Subscription"
          isDestructive={true}
          loading={cancelingSubscription}
        />
      </div>
    </ProtectedRoute>
  );
}