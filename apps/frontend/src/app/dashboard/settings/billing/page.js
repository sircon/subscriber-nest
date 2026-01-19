'use client';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
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
import { billingApi } from '@/lib/api';
function BillingSettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [billingStatus, setBillingStatus] = useState(null);
  const [currentUsage, setCurrentUsage] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
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
    async (sessionId) => {
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
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  const formatStatus = (status) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  const getStatusColor = (status) => {
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
  const getInvoiceUrl = (invoiceId) => {
    if (!invoiceId) return null;
    // Stripe invoice URLs follow this pattern: https://dashboard.stripe.com/invoices/{invoice_id}
    return `https://dashboard.stripe.com/invoices/${invoiceId}`;
  };
  if (loading) {
    return _jsx('div', {
      className: 'space-y-6',
      children: _jsxs(Card, {
        children: [
          _jsx(CardHeader, {
            children: _jsxs('div', {
              className: 'animate-pulse',
              children: [
                _jsx('div', {
                  className: 'h-6 bg-secondary rounded w-1/3 mb-2',
                }),
                _jsx('div', { className: 'h-4 bg-secondary rounded w-1/2' }),
              ],
            }),
          }),
          _jsx(CardContent, {
            children: _jsxs('div', {
              className: 'animate-pulse space-y-4',
              children: [
                _jsx('div', { className: 'h-20 bg-secondary rounded' }),
                _jsx('div', { className: 'h-20 bg-secondary rounded' }),
              ],
            }),
          }),
        ],
      }),
    });
  }
  return _jsxs('div', {
    children: [
      error &&
        _jsx('div', {
          className:
            'mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive',
          children: error,
        }),
      successMessage &&
        _jsx('div', {
          className:
            'mb-6 p-4 rounded-md bg-green-50 border border-green-200 text-green-800',
          children: successMessage,
        }),
      verifyingSession &&
        _jsx('div', {
          className:
            'mb-6 p-4 rounded-md bg-blue-50 border border-blue-200 text-blue-800',
          children: 'Verifying checkout session...',
        }),
      _jsxs('div', {
        className: 'space-y-6',
        children: [
          _jsxs(Card, {
            children: [
              _jsxs(CardHeader, {
                children: [
                  _jsx(CardTitle, { children: 'Current Month Usage' }),
                  _jsx(CardDescription, {
                    children: 'Your usage for the current billing period',
                  }),
                ],
              }),
              _jsx(CardContent, {
                children: currentUsage
                  ? _jsxs('div', {
                      className: 'space-y-4',
                      children: [
                        _jsxs('div', {
                          className: 'grid grid-cols-2 gap-4',
                          children: [
                            _jsxs('div', {
                              children: [
                                _jsx('p', {
                                  className: 'text-sm text-gray-600',
                                  children: 'Max Subscriber Count',
                                }),
                                _jsx('p', {
                                  className: 'text-2xl font-semibold',
                                  children:
                                    currentUsage.maxSubscriberCount.toLocaleString(),
                                }),
                              ],
                            }),
                            _jsxs('div', {
                              children: [
                                _jsx('p', {
                                  className: 'text-sm text-gray-600',
                                  children: 'Estimated Amount',
                                }),
                                _jsx('p', {
                                  className: 'text-2xl font-semibold',
                                  children: formatCurrency(
                                    currentUsage.calculatedAmount
                                  ),
                                }),
                              ],
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'pt-4 border-t',
                          children: [
                            _jsx('p', {
                              className: 'text-sm text-gray-600',
                              children: 'Billing Period',
                            }),
                            _jsxs('p', {
                              className: 'text-sm',
                              children: [
                                formatDate(currentUsage.billingPeriodStart),
                                ' -',
                                ' ',
                                formatDate(currentUsage.billingPeriodEnd),
                              ],
                            }),
                          ],
                        }),
                      ],
                    })
                  : _jsx('p', {
                      className: 'text-gray-600',
                      children: 'No usage data available',
                    }),
              }),
            ],
          }),
          _jsxs(Card, {
            children: [
              _jsxs(CardHeader, {
                children: [
                  _jsx(CardTitle, { children: 'Subscription Status' }),
                  _jsx(CardDescription, {
                    children: 'Your current subscription information',
                  }),
                ],
              }),
              _jsx(CardContent, {
                children: billingStatus?.subscription
                  ? _jsxs('div', {
                      className: 'space-y-4',
                      children: [
                        _jsxs('div', {
                          className: 'grid grid-cols-2 gap-4',
                          children: [
                            _jsxs('div', {
                              children: [
                                _jsx('p', {
                                  className: 'text-sm text-gray-600',
                                  children: 'Status',
                                }),
                                _jsx('p', {
                                  className: 'text-lg font-semibold',
                                  children: formatStatus(
                                    billingStatus.subscription.status
                                  ),
                                }),
                              ],
                            }),
                            _jsxs('div', {
                              children: [
                                _jsx('p', {
                                  className: 'text-sm text-gray-600',
                                  children: 'Current Period End',
                                }),
                                _jsx('p', {
                                  className: 'text-lg font-semibold',
                                  children: billingStatus.currentPeriodEnd
                                    ? formatDate(billingStatus.currentPeriodEnd)
                                    : 'N/A',
                                }),
                              ],
                            }),
                          ],
                        }),
                        billingStatus.subscription.cancelAtPeriodEnd &&
                          _jsx('div', {
                            className:
                              'p-3 rounded-md bg-yellow-50 border border-yellow-200',
                            children: _jsxs('p', {
                              className: 'text-sm text-yellow-800',
                              children: [
                                _jsx('span', {
                                  className: 'font-semibold',
                                  children: 'Note:',
                                }),
                                ' Your subscription will be canceled at the end of the current billing period.',
                              ],
                            }),
                          }),
                        _jsxs('div', {
                          className: 'pt-4 border-t flex gap-4',
                          children: [
                            _jsx(Button, {
                              onClick: handleOpenPortal,
                              disabled: portalLoading,
                              variant: 'default',
                              children: portalLoading
                                ? 'Opening...'
                                : 'Manage Subscription',
                            }),
                            _jsx(Button, {
                              onClick: handleOpenPortal,
                              disabled: portalLoading,
                              variant: 'outline',
                              children: portalLoading
                                ? 'Opening...'
                                : 'View Invoices',
                            }),
                          ],
                        }),
                      ],
                    })
                  : _jsxs('div', {
                      className: 'space-y-4',
                      children: [
                        _jsx('p', {
                          className: 'text-gray-600',
                          children: 'No active subscription found.',
                        }),
                        _jsx(Button, {
                          variant: 'default',
                          onClick: handleCreateCheckout,
                          disabled: checkoutLoading,
                          children: checkoutLoading
                            ? 'Creating checkout session...'
                            : 'Set Up Subscription',
                        }),
                      ],
                    }),
              }),
            ],
          }),
          _jsxs(Card, {
            children: [
              _jsxs(CardHeader, {
                children: [
                  _jsx(CardTitle, { children: 'Billing History' }),
                  _jsx(CardDescription, {
                    children: 'Past 12 months of billing periods and invoices',
                  }),
                ],
              }),
              _jsx(CardContent, {
                children:
                  billingHistory.length > 0
                    ? _jsxs(Table, {
                        children: [
                          _jsx(TableHeader, {
                            children: _jsxs(TableRow, {
                              children: [
                                _jsx(TableHead, { children: 'Period' }),
                                _jsx(TableHead, {
                                  children: 'Subscriber Count',
                                }),
                                _jsx(TableHead, { children: 'Amount' }),
                                _jsx(TableHead, { children: 'Status' }),
                                _jsx(TableHead, { children: 'Invoice' }),
                              ],
                            }),
                          }),
                          _jsx(TableBody, {
                            children: billingHistory.map((item, index) =>
                              _jsxs(
                                TableRow,
                                {
                                  children: [
                                    _jsx(TableCell, {
                                      children: _jsxs('div', {
                                        className: 'text-sm',
                                        children: [
                                          _jsx('div', {
                                            children: formatDate(
                                              item.billingPeriodStart
                                            ),
                                          }),
                                          _jsxs('div', {
                                            className: 'text-gray-500 text-xs',
                                            children: [
                                              'to ',
                                              formatDate(item.billingPeriodEnd),
                                            ],
                                          }),
                                        ],
                                      }),
                                    }),
                                    _jsx(TableCell, {
                                      children:
                                        item.maxSubscriberCount.toLocaleString(),
                                    }),
                                    _jsx(TableCell, {
                                      children: formatCurrency(
                                        item.calculatedAmount
                                      ),
                                    }),
                                    _jsx(TableCell, {
                                      children: _jsx('span', {
                                        className: getStatusColor(item.status),
                                        children: formatStatus(item.status),
                                      }),
                                    }),
                                    _jsx(TableCell, {
                                      children: item.stripeInvoiceId
                                        ? _jsx('a', {
                                            href:
                                              getInvoiceUrl(
                                                item.stripeInvoiceId
                                              ) || '#',
                                            target: '_blank',
                                            rel: 'noopener noreferrer',
                                            className:
                                              'text-blue-600 hover:underline text-sm',
                                            children: 'View Invoice',
                                          })
                                        : _jsx('span', {
                                            className: 'text-gray-400 text-sm',
                                            children: 'N/A',
                                          }),
                                    }),
                                  ],
                                },
                                index
                              )
                            ),
                          }),
                        ],
                      })
                    : _jsx('p', {
                        className: 'text-gray-600',
                        children: 'No billing history available',
                      }),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
export default function BillingSettingsPage() {
  return _jsx(Suspense, {
    fallback: _jsx('div', {
      className: 'space-y-6',
      children: _jsxs(Card, {
        children: [
          _jsx(CardHeader, {
            children: _jsxs('div', {
              className: 'animate-pulse',
              children: [
                _jsx('div', {
                  className: 'h-6 bg-secondary rounded w-1/3 mb-2',
                }),
                _jsx('div', { className: 'h-4 bg-secondary rounded w-1/2' }),
              ],
            }),
          }),
          _jsx(CardContent, {
            children: _jsxs('div', {
              className: 'animate-pulse space-y-4',
              children: [
                _jsx('div', { className: 'h-20 bg-secondary rounded' }),
                _jsx('div', { className: 'h-20 bg-secondary rounded' }),
              ],
            }),
          }),
        ],
      }),
    }),
    children: _jsx(BillingSettingsPageContent, {}),
  });
}
