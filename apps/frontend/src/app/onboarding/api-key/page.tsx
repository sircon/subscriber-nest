'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, espConnectionApi } from '@/lib/api';

type Provider = 'kit' | 'beehiiv' | 'mailchimp';

const providerNames: Record<Provider, string> = {
    kit: 'Kit',
    beehiiv: 'beehiiv',
    mailchimp: 'Mailchimp',
};

function ApiKeyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token, login } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [publicationId, setPublicationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const provider = (searchParams.get('provider') || '') as Provider;

    useEffect(() => {
        if (!provider || !['kit', 'beehiiv', 'mailchimp'].includes(provider)) {
            router.push('/onboarding');
        }
    }, [provider, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!apiKey.trim()) {
            setError('Please enter your API key');
            setLoading(false);
            return;
        }

        if (!publicationId.trim()) {
            setError('Please enter your publication ID');
            setLoading(false);
            return;
        }

        try {
            if (!token) {
                throw new Error('Authentication required. Please log in again.');
            }

            // Step 1: Create ESP connection
            const connection = await espConnectionApi.createConnection(
                { espType: provider, apiKey, publicationId },
                token,
                () => {
                    // Handle 401: redirect to login
                    router.push('/login');
                },
            );

            // Step 2: Complete onboarding
            const onboardingData = await authApi.completeOnboarding(token, () => {
                // Handle 401: redirect to login
                router.push('/login');
            });

            // Step 3: Update user in auth context
            login(token, onboardingData.user);

            // Step 4: Auto-trigger sync (don't block on errors)
            if (connection?.id) {
                try {
                    await espConnectionApi.triggerSync(connection.id, token, () => {
                        // Handle 401: already redirecting to dashboard, ignore
                    });
                } catch (syncErr) {
                    // Log sync error but don't block onboarding completion
                    console.error('Failed to trigger initial sync:', syncErr);
                    // User can manually trigger sync from dashboard
                }
            }

            // Step 5: Redirect to dashboard (with sync in progress if successful)
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!provider || !['kit', 'beehiiv', 'mailchimp'].includes(provider)) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Connect {providerNames[provider]}</CardTitle>
                        <CardDescription>
                            Enter your {providerNames[provider]} API key to sync your subscribers
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="apiKey"
                                    className="block text-sm font-medium mb-2"
                                >
                                    API Key
                                </label>
                                <Input
                                    id="apiKey"
                                    type="password"
                                    placeholder="Enter your API key"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    required
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="publicationId"
                                    className="block text-sm font-medium mb-2"
                                >
                                    Publication ID
                                </label>
                                <Input
                                    id="publicationId"
                                    type="text"
                                    placeholder="Enter your publication ID"
                                    value={publicationId}
                                    onChange={(e) => setPublicationId(e.target.value)}
                                    required
                                    disabled={loading}
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
                                disabled={loading || !apiKey.trim() || !publicationId.trim()}
                            >
                                {loading ? 'Syncing...' : 'Sync subscribers to vault'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function ApiKeyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <Card>
                        <CardHeader>
                            <div className="animate-pulse">
                                <div className="h-6 bg-secondary rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-secondary rounded w-1/2"></div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="animate-pulse space-y-4">
                                <div className="h-10 bg-secondary rounded"></div>
                                <div className="h-10 bg-secondary rounded"></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        }>
            <ApiKeyForm />
        </Suspense>
    );
}
