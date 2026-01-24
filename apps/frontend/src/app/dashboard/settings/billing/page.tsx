'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import {
  billingApi,
  BillingStatusResponse,
  CurrentUsageResponse,
  BillingHistoryItem,
} from '@/lib/api';

function BillingSettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] =
    useState<BillingStatusResponse | null>(null);
  const [currentUsage, setCurrentUsage] = useState<CurrentUsageResponse | null>(
    null
  );
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>(
    []
  );
  const [portalLoading, setPortalLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadBillingData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [status, usage, history] = await Promise.all([
        billingApi.getBillingStatus(token, () => router.push('/login')),
        billingApi.getCurrentUsage(token, () => router.push('/login')),
        billingApi.getBillingHistory(token, () => router.push('/login'), 12),
      ]);

      setBillingStatus(status);
      setCurrentUsage(usage);
      setBillingHistory(history);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load billing data'
      );
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  const handleCheckoutSuccess = useCallback(
    async (sessionId: string) => {
      if (!token) return;

      setVerifyingSession(true);
      setError(null);
      setSuccessMessage(null);

      try {
        // Verify checkout session
        await billingApi.verifyCheckoutSession(token, sessionId, () =>
          router.push('/login')
        );

        // Show success message
        setSuccessMessage('Subscription activated successfully');

        // Remove session_id from URL
        const newUrl = window.location.pathname;
        router.replace(newUrl);

        // Reload billing data
        await loadBillingData();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to verify checkout session'
        );
      } finally {
        setVerifyingSession(false);
      }
    },
    [token, router, loadBillingData]
  );

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    // Check for session_id query parameter
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      handleCheckoutSuccess(sessionId);
    } else {
      loadBillingData();
    }
  }, [token, router, searchParams, handleCheckoutSuccess, loadBillingData]);

  const handleOpenPortal = async () => {
    if (!token) return;

    setPortalLoading(true);
    setError(null);

    try {
      const response = await billingApi.createPortalSession(token, () =>
        router.push('/login')
      );
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No portal URL received from server');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to open customer portal'
      );
      setPortalLoading(false);
    }
  };

  const handleCreateCheckout = async () => {
    if (!token) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await billingApi.createCheckoutSession(token, () =>
        router.push('/login')
      );
      if (response.url) {
        // Redirect to Stripe Checkout URL
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create checkout session'
      );
      setCheckoutLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600';
      case 'invoiced':
        return 'text-blue-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getInvoiceUrl = (invoiceId: string | null) => {
    if (!invoiceId) return null;
    // Stripe invoice URLs follow this pattern: https://dashboard.stripe.com/invoices/{invoice_id}
    return `https://dashboard.stripe.com/invoices/${invoiceId}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="animate-pulse">
              <div className="h-6 bg-secondary rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-secondary rounded w-1/2"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-secondary rounded"></div>
              <div className="h-20 bg-secondary rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-md bg-green-50 border border-green-200 text-green-800">
          {successMessage}
        </div>
      )}

      {verifyingSession && (
        <div className="mb-6 p-4 rounded-md bg-blue-50 border border-blue-200 text-blue-800">
          Verifying checkout session...
        </div>
      )}

      <div className="space-y-6">
        {/* Current Billing Period Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Billing Period</CardTitle>
            <CardDescription>
              Your usage for the current billing period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentUsage ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Subscriber Count</p>
                    <p className="text-2xl font-semibold">
                      {currentUsage.maxSubscriberCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Amount</p>
                    <p className="text-2xl font-semibold">
                      {formatCurrency(currentUsage.calculatedAmount)}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Billing Period</p>
                  <p className="text-sm">
                    {formatDate(currentUsage.billingPeriodStart)} -{' '}
                    {formatDate(currentUsage.billingPeriodEnd)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No usage data available</p>
            )}
          </CardContent>
        </Card>

        {/* Subscription Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>
              Your current subscription information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingStatus?.subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-lg font-semibold">
                      {formatStatus(billingStatus.subscription.status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Period End</p>
                    <p className="text-lg font-semibold">
                      {billingStatus.currentPeriodEnd
                        ? formatDate(billingStatus.currentPeriodEnd)
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                {billingStatus.subscription.cancelAtPeriodEnd && (
                  <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Note:</span> Your
                      subscription will be canceled at the end of the current
                      billing period.
                    </p>
                  </div>
                )}
                <div className="pt-4 border-t flex gap-4">
                  <Button
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    variant="default"
                  >
                    {portalLoading ? 'Opening...' : 'Manage Subscription'}
                  </Button>
                  <Button
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    variant="outline"
                  >
                    {portalLoading ? 'Opening...' : 'View Invoices'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">No active subscription found.</p>
                <div className="flex gap-4">
                  <Button
                    variant="default"
                    onClick={handleCreateCheckout}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? 'Opening...' : 'Get started'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              Past 12 months of billing periods and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {billingHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Subscriber Count</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingHistory.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(item.billingPeriodStart)}</div>
                          <div className="text-gray-500 text-xs">
                            to {formatDate(item.billingPeriodEnd)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.maxSubscriberCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.calculatedAmount)}
                      </TableCell>
                      <TableCell>
                        <span className={getStatusColor(item.status)}>
                          {formatStatus(item.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.stripeInvoiceId ? (
                          <a
                            href={getInvoiceUrl(item.stripeInvoiceId) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View Invoice
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-600">No billing history available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-6 bg-secondary rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-secondary rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-secondary rounded"></div>
                <div className="h-20 bg-secondary rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <BillingSettingsPageContent />
    </Suspense>
  );
}
