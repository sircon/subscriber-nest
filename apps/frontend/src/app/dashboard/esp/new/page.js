'use client';
import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { espConfigs, supportsOAuth, getEspConfig } from '@/lib/esp-config';
export default function NewEspConnectionPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [selectedEspType, setSelectedEspType] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [publicationId, setPublicationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  // Check if selected ESP type supports OAuth
  const hasOAuth = selectedEspType ? supportsOAuth(selectedEspType) : false;
  const handleEspTypeSelect = (espType) => {
    setSelectedEspType(espType);
    setError(null);
    setValidationErrors({});
  };
  const handleOAuthConnect = async () => {
    if (!token || !selectedEspType) {
      return;
    }
    try {
      await espConnectionApi.initiateOAuth(selectedEspType, token, () => {
        router.push('/login');
      });
      // initiateOAuth will redirect the browser, so we don't need to do anything else
    } catch (err) {
      console.error('Failed to initiate OAuth:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initiate OAuth connection'
      );
    }
  };
  const handleBack = () => {
    setSelectedEspType(null);
    setApiKey('');
    setPublicationId('');
    setError(null);
    setValidationErrors({});
  };
  const validateForm = () => {
    const errors = {};
    if (!apiKey.trim()) {
      errors.apiKey = 'API Key is required';
    }
    if (!publicationId.trim()) {
      errors.publicationId = 'Publication ID is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    if (!validateForm() || !selectedEspType || !token) {
      return;
    }
    setLoading(true);
    try {
      // Step 1: Create ESP connection
      const connection = await espConnectionApi.createConnection(
        {
          espType: selectedEspType,
          apiKey: apiKey.trim(),
          publicationId: publicationId.trim(),
        },
        token,
        () => {
          router.push('/login');
        }
      );
      // Step 2: Automatically trigger sync
      try {
        await espConnectionApi.triggerSync(connection.id, token, () => {
          router.push('/login');
        });
      } catch (syncError) {
        // If sync trigger fails, still redirect to detail page
        // The user can manually trigger sync from there
        console.error('Failed to trigger sync:', syncError);
      }
      // Step 3: Redirect to ESP detail page
      router.push(`/dashboard/esp/${connection.id}`);
    } catch (err) {
      setError(
        err.message || 'Failed to create ESP connection. Please try again.'
      );
      setLoading(false);
    }
  };
  // ESP Type Selection View
  if (!selectedEspType) {
    return _jsxs('div', {
      className: 'container mx-auto px-4 py-8 max-w-4xl',
      children: [
        _jsxs('div', {
          className: 'mb-6',
          children: [
            _jsx(Link, {
              href: '/dashboard',
              children: _jsxs(Button, {
                variant: 'ghost',
                size: 'sm',
                className: 'mb-4',
                children: [
                  _jsx(ArrowLeft, { className: 'h-4 w-4 mr-2' }),
                  'Back to Dashboard',
                ],
              }),
            }),
            _jsx('h1', {
              className: 'text-3xl font-semibold mb-2',
              children: 'Connect New ESP',
            }),
            _jsx('p', {
              className: 'text-muted-foreground',
              children: 'Select your email service provider to get started',
            }),
          ],
        }),
        _jsx('div', {
          className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
          children: espConfigs.map((esp) =>
            _jsxs(
              Card,
              {
                className:
                  'cursor-pointer hover:border-primary transition-colors',
                onClick: () => handleEspTypeSelect(esp.id),
                children: [
                  _jsxs(CardHeader, {
                    children: [
                      _jsx(CardTitle, {
                        className: 'text-xl',
                        children: esp.name,
                      }),
                      _jsx(CardDescription, { children: esp.description }),
                    ],
                  }),
                  _jsx(CardContent, {
                    children: _jsxs(Button, {
                      variant: 'outline',
                      className: 'w-full',
                      onClick: (e) => {
                        e.stopPropagation();
                        handleEspTypeSelect(esp.id);
                      },
                      children: ['Select ', esp.name],
                    }),
                  }),
                ],
              },
              esp.id
            )
          ),
        }),
      ],
    });
  }
  // Form View
  return _jsxs('div', {
    className: 'container mx-auto px-4 py-8 max-w-2xl',
    children: [
      _jsxs('div', {
        className: 'mb-6',
        children: [
          _jsxs(Button, {
            variant: 'ghost',
            size: 'sm',
            className: 'mb-4',
            onClick: handleBack,
            disabled: loading,
            children: [
              _jsx(ArrowLeft, { className: 'h-4 w-4 mr-2' }),
              'Back to ESP Selection',
            ],
          }),
          _jsxs('h1', {
            className: 'text-3xl font-semibold mb-2',
            children: [
              'Connect ',
              getEspConfig(selectedEspType)?.name || selectedEspType,
            ],
          }),
          _jsx('p', {
            className: 'text-muted-foreground',
            children: 'Enter your API credentials to connect your account',
          }),
        ],
      }),
      _jsxs(Card, {
        children: [
          _jsxs(CardHeader, {
            children: [
              _jsx(CardTitle, { children: 'Connection Details' }),
              _jsx(CardDescription, {
                children: hasOAuth
                  ? 'Connect your account securely using OAuth'
                  : 'Please provide your API key and publication ID',
              }),
            ],
          }),
          _jsx(CardContent, {
            children: hasOAuth
              ? _jsx('div', {
                  className: 'space-y-4',
                  children: _jsxs('div', {
                    className:
                      'p-4 rounded-md bg-primary/10 border border-primary/20',
                    children: [
                      _jsx('p', {
                        className: 'text-sm text-primary font-medium mb-2',
                        children: 'Connect with OAuth',
                      }),
                      _jsxs('p', {
                        className: 'text-sm text-muted-foreground mb-4',
                        children: [
                          'Connect your',
                          ' ',
                          getEspConfig(selectedEspType)?.name ||
                            selectedEspType,
                          ' account securely using OAuth. No API keys needed!',
                        ],
                      }),
                      error &&
                        _jsx('div', {
                          className:
                            'p-3 rounded-md bg-destructive/10 border border-destructive/20 mb-4',
                          children: _jsx('p', {
                            className: 'text-sm text-destructive',
                            children: error,
                          }),
                        }),
                      _jsxs('div', {
                        className: 'flex gap-3',
                        children: [
                          _jsx(Button, {
                            type: 'button',
                            variant: 'outline',
                            onClick: handleBack,
                            disabled: loading,
                            className: 'flex-1',
                            children: 'Cancel',
                          }),
                          _jsx(Button, {
                            onClick: handleOAuthConnect,
                            disabled: loading,
                            className: 'flex-1',
                            children: loading
                              ? _jsxs(_Fragment, {
                                  children: [
                                    _jsx(Loader2, {
                                      className: 'h-4 w-4 mr-2 animate-spin',
                                    }),
                                    'Connecting...',
                                  ],
                                })
                              : 'Connect with OAuth',
                          }),
                        ],
                      }),
                    ],
                  }),
                })
              : _jsxs('form', {
                  onSubmit: handleSubmit,
                  className: 'space-y-4',
                  children: [
                    _jsxs('div', {
                      className: 'space-y-2',
                      children: [
                        _jsxs('label', {
                          htmlFor: 'apiKey',
                          className: 'text-sm font-medium',
                          children: [
                            'API Key ',
                            _jsx('span', {
                              className: 'text-destructive',
                              children: '*',
                            }),
                          ],
                        }),
                        _jsx(Input, {
                          id: 'apiKey',
                          type: 'password',
                          placeholder: 'Enter your API key',
                          value: apiKey,
                          onChange: (e) => setApiKey(e.target.value),
                          disabled: loading,
                          className: validationErrors.apiKey
                            ? 'border-destructive'
                            : '',
                        }),
                        validationErrors.apiKey &&
                          _jsx('p', {
                            className: 'text-sm text-destructive',
                            children: validationErrors.apiKey,
                          }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'space-y-2',
                      children: [
                        _jsxs('label', {
                          htmlFor: 'publicationId',
                          className: 'text-sm font-medium',
                          children: [
                            'Publication ID ',
                            _jsx('span', {
                              className: 'text-destructive',
                              children: '*',
                            }),
                          ],
                        }),
                        _jsx(Input, {
                          id: 'publicationId',
                          type: 'text',
                          placeholder: 'Enter your publication ID',
                          value: publicationId,
                          onChange: (e) => setPublicationId(e.target.value),
                          disabled: loading,
                          className: validationErrors.publicationId
                            ? 'border-destructive'
                            : '',
                        }),
                        validationErrors.publicationId &&
                          _jsx('p', {
                            className: 'text-sm text-destructive',
                            children: validationErrors.publicationId,
                          }),
                      ],
                    }),
                    error &&
                      _jsx('div', {
                        className:
                          'p-3 rounded-md bg-destructive/10 border border-destructive/20',
                        children: _jsx('p', {
                          className: 'text-sm text-destructive',
                          children: error,
                        }),
                      }),
                    _jsxs('div', {
                      className: 'flex gap-3 pt-4',
                      children: [
                        _jsx(Button, {
                          type: 'button',
                          variant: 'outline',
                          onClick: handleBack,
                          disabled: loading,
                          className: 'flex-1',
                          children: 'Cancel',
                        }),
                        _jsx(Button, {
                          type: 'submit',
                          disabled: loading,
                          className: 'flex-1',
                          children: loading
                            ? _jsxs(_Fragment, {
                                children: [
                                  _jsx(Loader2, {
                                    className: 'h-4 w-4 mr-2 animate-spin',
                                  }),
                                  'Connecting...',
                                ],
                              })
                            : 'Connect & Sync',
                        }),
                      ],
                    }),
                  ],
                }),
          }),
        ],
      }),
    ],
  });
}
