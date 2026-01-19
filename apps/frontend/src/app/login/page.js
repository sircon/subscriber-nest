'use client';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await authApi.sendCode({ email });
      setSuccess(true);
      // Redirect to verify-code page with email in query params
      setTimeout(() => {
        router.push(`/verify-code?email=${encodeURIComponent(email)}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  return _jsx('div', {
    className: 'min-h-screen flex items-center justify-center px-6',
    children: _jsx('div', {
      className: 'w-full max-w-md',
      children: _jsxs('div', {
        className: 'bg-card rounded-xl border border-border p-8',
        children: [
          _jsx('h1', {
            className: 'text-3xl font-semibold mb-2',
            children: 'Welcome back',
          }),
          _jsx('p', {
            className: 'text-muted-foreground mb-6',
            children: 'Enter your email to receive a verification code',
          }),
          _jsxs('form', {
            onSubmit: handleSubmit,
            className: 'space-y-4',
            children: [
              _jsxs('div', {
                children: [
                  _jsx('label', {
                    htmlFor: 'email',
                    className: 'block text-sm font-medium mb-2',
                    children: 'Email',
                  }),
                  _jsx(Input, {
                    id: 'email',
                    type: 'email',
                    placeholder: 'you@example.com',
                    value: email,
                    onChange: (e) => setEmail(e.target.value),
                    required: true,
                    disabled: loading || success,
                    className: 'w-full',
                  }),
                ],
              }),
              error &&
                _jsx('div', {
                  className:
                    'p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm',
                  children: error,
                }),
              success &&
                _jsx('div', {
                  className:
                    'p-3 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm',
                  children: 'Verification code sent! Redirecting...',
                }),
              _jsx(Button, {
                type: 'submit',
                className: 'w-full',
                disabled: loading || success,
                children: loading ? 'Sending...' : 'Send verification code',
              }),
            ],
          }),
        ],
      }),
    }),
  });
}
