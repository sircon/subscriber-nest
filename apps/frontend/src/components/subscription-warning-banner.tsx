'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { billingApi, BillingStatusResponse } from '@/lib/api';

const DISMISSAL_STORAGE_KEY = 'subscription-warning-dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function SubscriptionWarningBanner() {
  const router = useRouter();
  const { token } = useAuth();
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
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

  return (
    <Alert variant="warning" className="mb-6 relative">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <AlertTitle>Subscription Inactive</AlertTitle>
          <AlertDescription>
            Your subscription is inactive. Please update your payment method to continue syncing and exporting.
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageSubscription}
          >
            Manage Subscription
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
