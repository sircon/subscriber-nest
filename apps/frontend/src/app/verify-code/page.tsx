'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

function VerifyCodeForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const email = searchParams.get('email') || '';

    useEffect(() => {
        if (!email) {
            router.push('/login');
        }
    }, [email, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (code.length !== 6) {
            setError('Please enter a 6-digit code');
            setLoading(false);
            return;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiUrl}/auth/verify-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Invalid or expired verification code');
            }

            const data = await response.json();
            
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

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
        if (value.length <= 6) {
            setCode(value);
        }
    };

    if (!email) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-xl border border-border p-8">
                    <h1 className="text-3xl font-semibold mb-2">Enter verification code</h1>
                    <p className="text-muted-foreground mb-6">
                        We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="code"
                                className="block text-sm font-medium mb-2"
                            >
                                Verification Code
                            </label>
                            <Input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                placeholder="000000"
                                value={code}
                                onChange={handleCodeChange}
                                maxLength={6}
                                required
                                disabled={loading}
                                className="w-full text-center text-2xl tracking-widest font-mono"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || code.length !== 6}
                        >
                            {loading ? 'Verifying...' : 'Verify code'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function VerifyCodePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="w-full max-w-md">
                    <div className="bg-card rounded-xl border border-border p-8">
                        <div className="animate-pulse">
                            <div className="h-8 bg-secondary rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-secondary rounded w-1/2 mb-6"></div>
                            <div className="h-10 bg-secondary rounded mb-4"></div>
                            <div className="h-10 bg-secondary rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        }>
            <VerifyCodeForm />
        </Suspense>
    );
}
