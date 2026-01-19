'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi, type List } from '@/lib/api';
import { ListSelector } from '@/components/ListSelector';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';

function OAuthListSelection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const connectionId = searchParams.get('connectionId');
  const isOnboarding = searchParams.get('isOnboarding') === 'true';

  const [lists, setLists] = useState<List[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connectionId || !token) {
      setError('Missing connection ID or authentication');
      setLoading(false);
      return;
    }

    async function fetchLists() {
      if (!connectionId || !token) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const availableLists = await espConnectionApi.getLists(
          connectionId,
          token
        );
        setLists(availableLists);
        // Default to all lists selected
        setSelectedListIds(availableLists.map((list) => list.id));
      } catch (err) {
        console.error('Error fetching lists:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch available lists'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchLists();
  }, [connectionId, token]);

  const handleSave = async () => {
    if (!connectionId || !token) return;

    setSaving(true);
    setError(null);

    try {
      await espConnectionApi.updateSelectedLists(
        connectionId,
        { selectedListIds },
        token
      );

      // Redirect based on whether this is an onboarding flow
      if (isOnboarding) {
        router.push('/onboarding/stripe');
      } else {
        router.push(`/dashboard/esp/${connectionId}?oauth=success`);
      }
    } catch (err) {
      console.error('Error updating selected lists:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save list selection'
      );
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isOnboarding) {
      router.push('/onboarding');
    } else {
      router.push('/dashboard/esp');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading available lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <CardTitle>Select Lists to Sync</CardTitle>
                <CardDescription>
                  Choose which lists you want to sync from your email service
                  provider. All lists are selected by default.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {lists.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  No lists found for this connection.
                </p>
                <Button onClick={handleBack} variant="outline">
                  Go Back
                </Button>
              </div>
            ) : (
              <>
                <ListSelector
                  lists={lists}
                  selectedListIds={selectedListIds}
                  onSelectionChange={setSelectedListIds}
                  loading={false}
                  error={null}
                />
                <div className="mt-6 flex justify-end gap-4">
                  <Button onClick={handleBack} variant="outline">
                    Back
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || selectedListIds.length === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OAuthListSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <OAuthListSelection />
    </Suspense>
  );
}
