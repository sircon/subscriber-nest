'use client';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { billingApi } from '@/lib/api';
const DISMISSAL_STORAGE_KEY = 'subscription-warning-dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
export function SubscriptionWarningBanner() {
  const router = useRouter();
  const { token } = useAuth();
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const checkDismissal = () => {
      const dismissalData = localStorage.getItem(DISMISSAL_STORAGE_KEY);
      if (dismissalData) {
        const { timestamp } = JSON.parse(dismissalData);
        const now = Date.now();
        const timeSinceDismissal = now - timestamp;
        // If less than 24 hours have passed, keep it dismissed
        if (timeSinceDismissal < DISMISSAL_DURATION_MS) {
          setDismissed(true);
          return true;
        } else {
          // 24 hours have passed, clear dismissal
          localStorage.removeItem(DISMISSAL_STORAGE_KEY);
        }
      }
      return false;
    };
    checkDismissal();
  }, []);
  useEffect(() => {
    const fetchBillingStatus = async () => {
      if (!token || dismissed) {
        setLoading(false);
        return;
      }
      try {
        const status = await billingApi.getBillingStatus(token, () => {
          router.push('/login');
        });
        setBillingStatus(status);
      } catch (err) {
        console.error('Failed to fetch billing status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBillingStatus();
  }, [token, router, dismissed]);
  const handleDismiss = () => {
    const dismissalData = {
      timestamp: Date.now(),
    };
    localStorage.setItem(DISMISSAL_STORAGE_KEY, JSON.stringify(dismissalData));
    setDismissed(true);
  };
  const handleManageSubscription = () => {
    router.push('/dashboard/settings/billing');
  };
  // Don't show banner if:
  // - Still loading
  // - User dismissed it (and less than 24 hours passed)
  // - Subscription is active
  if (loading || dismissed || billingStatus?.hasActiveSubscription) {
    return null;
  }
  return _jsx('div', {
    className:
      'mb-6 relative rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/8 to-amber-500/10 p-5 shadow-sm backdrop-blur-sm',
    children: _jsxs('div', {
      className: 'flex items-start justify-between gap-4',
      children: [
        _jsxs('div', {
          className: 'flex-1 space-y-1.5',
          children: [
            _jsx('h5', {
              className:
                'font-semibold text-amber-200 leading-tight tracking-tight',
              children: 'Subscription Inactive',
            }),
            _jsx('p', {
              className: 'text-sm text-amber-100/90 leading-relaxed',
              children:
                'Your subscription is inactive. Please update your payment method to continue syncing and exporting.',
            }),
          ],
        }),
        _jsxs('div', {
          className: 'flex items-center gap-3 flex-shrink-0',
          children: [
            _jsx(Button, {
              variant: 'default',
              size: 'sm',
              onClick: handleManageSubscription,
              className:
                'bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all hover:shadow-md',
              children: 'Manage Subscription',
            }),
            _jsx(Button, {
              variant: 'ghost',
              size: 'icon',
              className:
                'h-8 w-8 text-amber-200/70 hover:text-amber-200 hover:bg-amber-500/10',
              onClick: handleDismiss,
              'aria-label': 'Dismiss',
              children: _jsx(X, { className: 'h-4 w-4' }),
            }),
          ],
        }),
      ],
    }),
  });
}
