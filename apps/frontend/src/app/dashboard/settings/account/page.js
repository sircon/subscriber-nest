'use client';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { accountApi } from '@/lib/api';
export default function AccountSettingsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
  }, [token, router]);
  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await accountApi.deleteAccount(token, () => router.push('/login'));
      setSuccessMessage(
        'Account deletion requested. You have 30 days to export your data. Your subscription has been canceled.'
      );
      setDeleteDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to request account deletion'
      );
    } finally {
      setDeleteLoading(false);
    }
  };
  if (!user) {
    return _jsx('div', {
      className: 'animate-pulse',
      children: _jsxs(Card, {
        children: [
          _jsxs(CardHeader, {
            children: [
              _jsx('div', { className: 'h-6 bg-secondary rounded w-1/3 mb-2' }),
              _jsx('div', { className: 'h-4 bg-secondary rounded w-1/2' }),
            ],
          }),
          _jsx(CardContent, {
            children: _jsx('div', { className: 'h-20 bg-secondary rounded' }),
          }),
        ],
      }),
    });
  }
  return _jsxs('div', {
    children: [
      error &&
        _jsx(Alert, {
          variant: 'destructive',
          className: 'mb-6',
          children: _jsx(AlertDescription, { children: error }),
        }),
      successMessage &&
        _jsx(Alert, {
          variant: 'warning',
          className: 'mb-6',
          children: _jsx(AlertDescription, { children: successMessage }),
        }),
      _jsxs('div', {
        className: 'space-y-6',
        children: [
          _jsxs(Card, {
            children: [
              _jsxs(CardHeader, {
                children: [
                  _jsx(CardTitle, { children: 'Account Information' }),
                  _jsx(CardDescription, { children: 'Your account details' }),
                ],
              }),
              _jsx(CardContent, {
                children: _jsx('div', {
                  className: 'space-y-4',
                  children: _jsxs('div', {
                    children: [
                      _jsx('label', {
                        htmlFor: 'email',
                        className:
                          'block text-sm font-medium text-gray-700 mb-2',
                        children: 'Email Address',
                      }),
                      _jsx(Input, {
                        id: 'email',
                        type: 'email',
                        value: user.email,
                        readOnly: true,
                        className: 'bg-gray-50 cursor-not-allowed',
                      }),
                      _jsx('p', {
                        className: 'text-xs text-gray-500 mt-1',
                        children: 'Your email address cannot be changed',
                      }),
                    ],
                  }),
                }),
              }),
            ],
          }),
          _jsxs(Card, {
            children: [
              _jsxs(CardHeader, {
                children: [
                  _jsx(CardTitle, { children: 'Account Deletion' }),
                  _jsx(CardDescription, {
                    children:
                      'Permanently delete your account and all associated data',
                  }),
                ],
              }),
              _jsx(CardContent, {
                children: _jsxs('div', {
                  className: 'space-y-4',
                  children: [
                    _jsx(Alert, {
                      variant: 'destructive',
                      children: _jsxs(AlertDescription, {
                        children: [
                          _jsx('strong', { children: 'Warning:' }),
                          ' This action cannot be undone. Once you request account deletion, your account will be permanently deleted after 30 days. During this grace period, you can export your data. Your subscription will be canceled immediately.',
                        ],
                      }),
                    }),
                    _jsx(Button, {
                      variant: 'destructive',
                      onClick: () => setDeleteDialogOpen(true),
                      disabled: deleteLoading,
                      children: 'Delete Account',
                    }),
                  ],
                }),
              }),
            ],
          }),
        ],
      }),
      _jsx(Dialog, {
        open: deleteDialogOpen,
        onOpenChange: setDeleteDialogOpen,
        children: _jsxs(DialogContent, {
          children: [
            _jsxs(DialogHeader, {
              children: [
                _jsx(DialogTitle, { children: 'Delete Account' }),
                _jsx(DialogDescription, {
                  children:
                    'Are you sure you want to delete your account? This action cannot be undone.',
                }),
              ],
            }),
            _jsx('div', {
              className: 'space-y-4 py-4',
              children: _jsx(Alert, {
                variant: 'warning',
                children: _jsx(AlertDescription, {
                  children: _jsxs('div', {
                    className: 'space-y-2',
                    children: [
                      _jsx('p', {
                        children: _jsx('strong', {
                          children:
                            'What happens when you delete your account:',
                        }),
                      }),
                      _jsxs('ul', {
                        className: 'list-disc list-inside space-y-1 text-sm',
                        children: [
                          _jsx('li', {
                            children:
                              'Your account will be deleted after a 30-day grace period',
                          }),
                          _jsx('li', {
                            children:
                              'You can export your data during the grace period',
                          }),
                          _jsx('li', {
                            children:
                              'Your subscription will be canceled immediately',
                          }),
                          _jsx('li', {
                            children:
                              'All your data (ESP connections, subscribers, sync history, billing records) will be permanently deleted',
                          }),
                        ],
                      }),
                    ],
                  }),
                }),
              }),
            }),
            _jsxs(DialogFooter, {
              children: [
                _jsx(Button, {
                  variant: 'outline',
                  onClick: () => setDeleteDialogOpen(false),
                  disabled: deleteLoading,
                  children: 'Cancel',
                }),
                _jsx(Button, {
                  variant: 'destructive',
                  onClick: handleDeleteAccount,
                  disabled: deleteLoading,
                  children: deleteLoading ? 'Deleting...' : 'Delete Account',
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
