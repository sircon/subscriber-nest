'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { billingApi } from '@/lib/api';

function StripeOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    // Check if user canceled checkout
    const canceledParam = searchParams.get('canceled');
    if (canceledParam === 'true') {
      setCanceled(true);
    }
  }, [searchParams]);

  const handleConnectStripe = async () => {
    setLoading(true);
    setError(null);
    setCanceled(false);

    try {
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Create checkout session
      const response = await billingApi.createCheckoutSession(token, () => {
        // Handle 401: redirect to login
        router.push('/login');
      });

      // Redirect to Stripe Checkout
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Connect your payment method
            </CardTitle>
            <CardDescription>
              SubscriberNest uses a usage-based billing model. You'll be charged
              $5 for the first 10,000 subscribers, then $1 per each additional
              10,000 subscribers per month. Your subscription will be billed
              monthly based on your maximum subscriber count during each billing
              period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canceled && (
              <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
                Checkout was canceled. You can try again below.
              </div>
            )}

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleConnectStripe}
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect Stripe'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function StripeOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-secondary rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-secondary rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse">
                  <div className="h-10 bg-secondary rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <StripeOnboardingForm />
    </Suspense>
  );
}
