'use client';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
function VerifyCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const email = searchParams.get('email') || '';
  useEffect(() => {
    if (!email) {
      router.push('/login');
    }
  }, [email, router]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.verifyCode({ email, code });
      // Use auth context to store token and user
      login(data.token, data.user);
      // Redirect based on isOnboarded status
      if (data.user.isOnboarded) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setCode(value);
    }
  };
  if (!email) {
    return null; // Will redirect in useEffect
  }
  return _jsx('div', {
    className: 'min-h-screen flex items-center justify-center px-6',
    children: _jsx('div', {
      className: 'w-full max-w-md',
      children: _jsxs('div', {
        className: 'bg-card rounded-xl border border-border p-8',
        children: [
          _jsx('h1', {
            className: 'text-3xl font-semibold mb-2',
            children: 'Enter verification code',
          }),
          _jsxs('p', {
            className: 'text-muted-foreground mb-6',
            children: [
              'We sent a 6-digit code to',
              ' ',
              _jsx('span', {
                className: 'font-medium text-foreground',
                children: email,
              }),
            ],
          }),
          _jsxs('form', {
            onSubmit: handleSubmit,
            className: 'space-y-4',
            children: [
              _jsxs('div', {
                children: [
                  _jsx('label', {
                    htmlFor: 'code',
                    className: 'block text-sm font-medium mb-2',
                    children: 'Verification Code',
                  }),
                  _jsx(Input, {
                    id: 'code',
                    type: 'text',
                    inputMode: 'numeric',
                    pattern: '[0-9]{6}',
                    placeholder: '000000',
                    value: code,
                    onChange: handleCodeChange,
                    maxLength: 6,
                    required: true,
                    disabled: loading,
                    className:
                      'w-full text-center text-2xl tracking-widest font-mono',
                    autoFocus: true,
                  }),
                ],
              }),
              error &&
                _jsx('div', {
                  className:
                    'p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm',
                  children: error,
                }),
              _jsx(Button, {
                type: 'submit',
                className: 'w-full',
                disabled: loading || code.length !== 6,
                children: loading ? 'Verifying...' : 'Verify code',
              }),
            ],
          }),
        ],
      }),
    }),
  });
}
export default function VerifyCodePage() {
  return _jsx(Suspense, {
    fallback: _jsx('div', {
      className: 'min-h-screen flex items-center justify-center px-6',
      children: _jsx('div', {
        className: 'w-full max-w-md',
        children: _jsx('div', {
          className: 'bg-card rounded-xl border border-border p-8',
          children: _jsxs('div', {
            className: 'animate-pulse',
            children: [
              _jsx('div', { className: 'h-8 bg-secondary rounded w-3/4 mb-2' }),
              _jsx('div', { className: 'h-4 bg-secondary rounded w-1/2 mb-6' }),
              _jsx('div', { className: 'h-10 bg-secondary rounded mb-4' }),
              _jsx('div', { className: 'h-10 bg-secondary rounded' }),
            ],
          }),
        }),
      }),
    }),
    children: _jsx(VerifyCodeForm, {}),
  });
}
