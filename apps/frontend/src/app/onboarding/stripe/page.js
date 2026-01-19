'use client';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
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
import { billingApi, espConnectionApi } from '@/lib/api';
/**
 * Calculate estimated monthly cost based on subscriber count
 * $5 for the first 10,000 subscribers, then $1 per each additional 10,000
 */
function calculateEstimatedCost(subscriberCount) {
  if (subscriberCount <= 0) return 5; // Base price
  if (subscriberCount <= 10000) return 5;
  const additionalBlocks = Math.ceil((subscriberCount - 10000) / 10000);
  return 5 + additionalBlocks;
}
function StripeOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [canceled, setCanceled] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(null);
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
  const estimatedCost =
    subscriberCount !== null ? calculateEstimatedCost(subscriberCount) : null;
  return _jsx('div', {
    className: 'min-h-screen flex items-center justify-center px-6 py-12',
    children: _jsx('div', {
      className: 'w-full max-w-md',
      children: _jsxs(Card, {
        children: [
          _jsxs(CardHeader, {
            children: [
              _jsx(CardTitle, {
                className: 'text-2xl',
                children: 'Connect your payment method',
              }),
              _jsx(CardDescription, {
                children:
                  "SubscriberNest uses a usage-based billing model. You'll be charged $5 for the first 10,000 subscribers, then $1 per each additional 10,000 subscribers per month. Your subscription will be billed monthly based on your maximum subscriber count during each billing period.",
              }),
            ],
          }),
          _jsxs(CardContent, {
            className: 'space-y-4',
            children: [
              !loadingCount &&
                subscriberCount !== null &&
                _jsxs('div', {
                  className:
                    'p-4 rounded-md bg-primary/5 border border-primary/10',
                  children: [
                    _jsxs('div', {
                      className: 'flex justify-between items-center mb-2',
                      children: [
                        _jsx('span', {
                          className: 'text-sm text-muted-foreground',
                          children: 'Current subscribers',
                        }),
                        _jsx('span', {
                          className: 'font-semibold',
                          children: subscriberCount.toLocaleString(),
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'flex justify-between items-center',
                      children: [
                        _jsx('span', {
                          className: 'text-sm text-muted-foreground',
                          children: 'Estimated monthly cost',
                        }),
                        _jsxs('span', {
                          className: 'font-semibold text-primary',
                          children: ['$', estimatedCost, '/month'],
                        }),
                      ],
                    }),
                  ],
                }),
              loadingCount &&
                _jsxs('div', {
                  className: 'p-4 rounded-md bg-secondary/50 animate-pulse',
                  children: [
                    _jsx('div', {
                      className: 'h-4 bg-secondary rounded w-3/4 mb-2',
                    }),
                    _jsx('div', {
                      className: 'h-4 bg-secondary rounded w-1/2',
                    }),
                  ],
                }),
              canceled &&
                _jsx('div', {
                  className:
                    'p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm',
                  children: 'Checkout was canceled. You can try again below.',
                }),
              error &&
                _jsx('div', {
                  className:
                    'p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm',
                  children: error,
                }),
              _jsx(Button, {
                onClick: handleConnectStripe,
                className: 'w-full',
                disabled: loading,
                children: loading ? 'Connecting...' : 'Connect Stripe',
              }),
            ],
          }),
        ],
      }),
    }),
  });
}
export default function StripeOnboardingPage() {
  return _jsx(Suspense, {
    fallback: _jsx('div', {
      className: 'min-h-screen flex items-center justify-center px-6 py-12',
      children: _jsx('div', {
        className: 'w-full max-w-md',
        children: _jsxs(Card, {
          children: [
            _jsx(CardHeader, {
              children: _jsxs('div', {
                className: 'animate-pulse',
                children: [
                  _jsx('div', {
                    className: 'h-6 bg-secondary rounded w-3/4 mb-2',
                  }),
                  _jsx('div', { className: 'h-4 bg-secondary rounded w-1/2' }),
                ],
              }),
            }),
            _jsx(CardContent, {
              children: _jsx('div', {
                className: 'animate-pulse',
                children: _jsx('div', {
                  className: 'h-10 bg-secondary rounded',
                }),
              }),
            }),
          ],
        }),
      }),
    }),
    children: _jsx(StripeOnboardingForm, {}),
  });
}
