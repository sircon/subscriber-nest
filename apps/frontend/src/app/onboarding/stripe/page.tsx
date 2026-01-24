'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
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
import { authApi, billingApi, espConnectionApi } from '@/lib/api';

/**
 * Calculate estimated monthly cost based on subscriber count
 * $5 for the first 10,000 subscribers, then $1 per each additional 10,000
 */
function calculateEstimatedCost(subscriberCount: number): number {
  if (subscriberCount <= 0) return 5; // Base price
  if (subscriberCount <= 10000) return 5;
  const additionalBlocks = Math.ceil((subscriberCount - 10000) / 10000);
  return 5 + additionalBlocks;
}

function StripeOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canceled, setCanceled] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  const fetchSubscriberCount = useCallback(async () => {
    if (!token) {
      setLoadingCount(false);
      return;
    }

    try {
      // Get all connections
      const connections = await espConnectionApi.getUserConnections(
        token,
        () => {
          router.push('/login');
        }
      );

      if (connections.length === 0) {
        setLoadingCount(false);
        return;
      }

      // Fetch subscriber count for each connection and sum them
      const counts = await Promise.all(
        connections.map((conn) =>
          espConnectionApi
            .getSubscriberCount(conn.id, token, () => {})
            .then((res) => res.count)
            .catch(() => 0)
        )
      );

      const totalCount = counts.reduce((sum, count) => sum + count, 0);
      setSubscriberCount(totalCount);
    } catch (err) {
      console.error('Failed to fetch subscriber count:', err);
      // Don't show error, just don't display the count
    } finally {
      setLoadingCount(false);
    }
  }, [token, router]);

  useEffect(() => {
    // Check if user canceled checkout
    const canceledParam = searchParams.get('canceled');
    if (canceledParam === 'true') {
      setCanceled(true);
    }

    // Fetch subscriber count
    fetchSubscriberCount();
  }, [searchParams, fetchSubscriberCount]);

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

  const handleSkip = async () => {
    setSkipLoading(true);
    setError(null);
    setCanceled(false);

    try {
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      await authApi.completeOnboarding(token, () => {
        router.push('/login');
      });

      await checkAuth();

      window.location.href = '/dashboard?welcome=true';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSkipLoading(false);
    }
  };

  const estimatedCost =
    subscriberCount !== null ? calculateEstimatedCost(subscriberCount) : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Connect your payment method
            </CardTitle>
            <CardDescription>
              Audience Safe uses a usage-based billing model. You'll be charged
              $5 for the first 10,000 subscribers, then $1 per each additional
              10,000 subscribers per month. Your subscription will be billed
              monthly based on your maximum subscriber count during each billing
              period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subscriber count and estimated cost */}
            {!loadingCount && subscriberCount !== null && (
              <div className="p-4 rounded-md bg-primary/5 border border-primary/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    Current subscribers
                  </span>
                  <span className="font-semibold">
                    {subscriberCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Estimated monthly cost
                  </span>
                  <span className="font-semibold text-primary">
                    ${estimatedCost}/month
                  </span>
                </div>
              </div>
            )}

            {loadingCount && (
              <div className="p-4 rounded-md bg-secondary/50 animate-pulse">
                <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-secondary rounded w-1/2"></div>
              </div>
            )}

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

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSkip}
                variant="outline"
                disabled={loading || skipLoading}
              >
                {skipLoading ? 'Skipping...' : 'Skip for now'}
              </Button>
              <Button
                onClick={handleConnectStripe}
                className="w-full"
                disabled={loading || skipLoading}
              >
                {loading ? 'Connecting...' : 'Connect Stripe'}
              </Button>
            </div>
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
