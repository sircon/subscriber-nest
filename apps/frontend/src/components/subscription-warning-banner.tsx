'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { billingApi, BillingStatusResponse } from '@/lib/api';

const DISMISSAL_STORAGE_KEY = 'subscription-warning-dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function SubscriptionWarningBanner() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [billingStatus, setBillingStatus] =
    useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

  const handleStartSubscription = async () => {
    if (!token) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const response = await billingApi.createCheckoutSession(token, () => {
        router.push('/login');
      });
      if (response?.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : 'Failed to create checkout session'
      );
      setCheckoutLoading(false);
    }
  };

  if (user?.deleteRequestedAt) {
    const deletionDate =
      typeof user.deleteRequestedAt === 'string'
        ? new Date(user.deleteRequestedAt)
        : user.deleteRequestedAt;
    const deletionDeadline = new Date(deletionDate);
    deletionDeadline.setDate(deletionDeadline.getDate() + 30);

    return (
      <div className="mb-6 relative rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/8 to-amber-500/10 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <h5 className="font-semibold text-amber-200 leading-tight tracking-tight">
              Account Deletion Scheduled
            </h5>
            <p className="text-sm text-amber-100/90 leading-relaxed">
              Your account is scheduled for deletion on{' '}
              {deletionDeadline.toLocaleDateString()}.
            </p>
            <p className="text-sm text-amber-100/80 leading-relaxed">
              To cancel deletion, contact support before the deadline.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push('/account-deletion')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all hover:shadow-md"
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Don't show banner if:
  // - Still loading
  // - User dismissed it (and less than 24 hours passed)
  // - Subscription is active
  if (loading || dismissed || billingStatus?.hasActiveSubscription) {
    return null;
  }

  return (
    <div className="mb-6 relative rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/8 to-amber-500/10 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <h5 className="font-semibold text-amber-200 leading-tight tracking-tight">
            Subscription Inactive
          </h5>
          <p className="text-sm text-amber-100/90 leading-relaxed">
            {billingStatus?.subscription == null
              ? "You don't have an active subscription. Start one to continue syncing and exporting."
              : 'Your subscription is inactive. Please update your payment method to continue syncing and exporting.'}
          </p>
          {checkoutError && (
            <p className="text-sm text-amber-200/90">{checkoutError}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {billingStatus?.subscription == null ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleStartSubscription}
              disabled={checkoutLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all hover:shadow-md"
            >
              {checkoutLoading ? 'Opening...' : 'Start Subscription'}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleManageSubscription}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all hover:shadow-md"
            >
              Manage Subscription
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-200/70 hover:text-amber-200 hover:bg-amber-500/10"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
