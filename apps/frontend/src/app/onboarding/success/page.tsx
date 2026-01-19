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
import { useAuth } from '@/contexts/AuthContext';
import { billingApi, espConnectionApi } from '@/lib/api';

function OnboardingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, checkAuth } = useAuth();
  const [status, setStatus] = useState<
    'verifying' | 'syncing' | 'success' | 'error'
  >('verifying');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('Verifying payment...');

  const handleSuccess = useCallback(async () => {
    if (!token) {
      router.push('/login');
      return;
    }

    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('No session ID found. Please try the checkout process again.');
      setStatus('error');
      return;
    }

    try {
      // Step 1: Verify checkout session with backend
      setProgress('Verifying payment...');
      await billingApi.verifyCheckoutSession(token, sessionId, () => {
        router.push('/login');
      });

      // Step 2: Refresh auth to update isOnboarded in cookies
      setProgress('Updating account...');
      await checkAuth();

      // Step 3: Trigger sync for all ESP connections
      setStatus('syncing');
      setProgress('Starting initial sync...');

      const connections = await espConnectionApi.getUserConnections(
        token,
        () => {
          router.push('/login');
        }
      );

      // Trigger sync for each connection (don't wait for completion, just queue them)
      const syncPromises = connections.map((conn) =>
        espConnectionApi
          .triggerSync(conn.id, token, () => {})
          .catch((err) => {
            // Log sync errors but don't fail the whole process
            console.error(
              `Failed to trigger sync for connection ${conn.id}:`,
              err
            );
          })
      );

      // Wait for all syncs to be queued
      await Promise.all(syncPromises);

      // Step 4: Success - redirect to dashboard immediately
      setStatus('success');
      setProgress('Setup complete! Redirecting to dashboard...');

      // Redirect immediately with welcome param - dashboard will show loading state
      // Using window.location.href ensures the middleware sees the updated cookies
      window.location.href = '/dashboard?welcome=true';
    } catch (err) {
      console.error('Onboarding success error:', err);
      setError(
        err instanceof Error ? err.message : 'An error occurred during setup'
      );
      setStatus('error');
    }
  }, [token, searchParams, router, checkAuth]);

  useEffect(() => {
    handleSuccess();
  }, [handleSuccess]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {status === 'error' ? 'Setup Error' : 'Setting up your account'}
            </CardTitle>
            <CardDescription>
              {status === 'error'
                ? 'There was a problem completing your setup'
                : 'Please wait while we complete your setup...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'error' ? (
              <>
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/onboarding/stripe')}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => router.push('/login')}
                    className="flex-1 px-4 py-2 border border-input rounded-md hover:bg-accent"
                  >
                    Go to Login
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                  <span className="text-sm text-muted-foreground">
                    {progress}
                  </span>
                </div>

                {/* Progress indicators */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        status === 'verifying' ||
                        status === 'syncing' ||
                        status === 'success'
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    ></div>
                    <span className="text-sm">Payment verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        status === 'syncing' || status === 'success'
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    ></div>
                    <span className="text-sm">Account activated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        status === 'success' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    ></div>
                    <span className="text-sm">Initial sync started</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense
      fallback={
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
                <div className="animate-pulse">
                  <div className="h-10 bg-secondary rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <OnboardingSuccessContent />
    </Suspense>
  );
}
