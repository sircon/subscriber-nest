'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi, type List } from '@/lib/api';
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
import {
  espConfigs,
  type EspType,
  supportsOAuth,
  getEspConfig,
} from '@/lib/esp-config';
import { ListSelector } from '@/components/ListSelector';

export default function NewEspConnectionPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [selectedEspType, setSelectedEspType] = useState<EspType | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    apiKey?: string;
  }>({});
  const [lists, setLists] = useState<List[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [fetchingLists, setFetchingLists] = useState(false);
  const [listsFetched, setListsFetched] = useState(false);
  const [tempConnectionId, setTempConnectionId] = useState<string | null>(null);

  // Check if selected ESP type supports OAuth
  const hasOAuth = selectedEspType ? supportsOAuth(selectedEspType) : false;

  const handleEspTypeSelect = (espType: EspType) => {
    setSelectedEspType(espType);
    setError(null);
    setValidationErrors({});
  };

  const handleOAuthConnect = async () => {
    if (!token || !selectedEspType) {
      return;
    }

    try {
      await espConnectionApi.initiateOAuth(
        selectedEspType as 'kit' | 'mailchimp',
        token,
        () => {
          router.push('/login');
        }
      );
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
    if (listsFetched) {
      // Go back from list selection to API key form
      setListsFetched(false);
      setLists([]);
      setSelectedListIds([]);
      setTempConnectionId(null);
      setError(null);
      // Delete temporary connection if it exists
      if (tempConnectionId && token) {
        espConnectionApi
          .deleteConnection(tempConnectionId, token, () => {
            router.push('/login');
          })
          .catch(() => {
            // Ignore errors when deleting temporary connection
          });
      }
    } else {
      // Go back from form to ESP selection
      setSelectedEspType(null);
      setApiKey('');
      setError(null);
      setValidationErrors({});
    }
  };

  const validateForm = (): boolean => {
    const errors: { apiKey?: string } = {};

    if (!apiKey.trim()) {
      errors.apiKey = 'API Key is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleValidateAndFetchLists = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    setFetchingLists(true);
    setError(null);
    setValidationErrors({});

    try {
      if (!token || !selectedEspType) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Create connection (this validates API key and fetches lists)
      const connection = await espConnectionApi.createConnection(
        {
          espType: selectedEspType,
          apiKey: apiKey.trim(),
        },
        token,
        () => {
          router.push('/login');
        }
      );

      // Fetch available lists from the created connection
      const availableLists = await espConnectionApi.getLists(
        connection.id,
        token,
        () => {
          router.push('/login');
        }
      );

      if (availableLists.length === 0) {
        setError('No lists found. Please check your API key and try again.');
        // Delete the temporary connection if no lists found
        try {
          await espConnectionApi.deleteConnection(connection.id, token, () => {
            router.push('/login');
          });
        } catch {
          // Ignore errors when deleting temporary connection
        }
        setFetchingLists(false);
        return;
      }

      // Set lists and default to all selected
      setLists(availableLists);
      setSelectedListIds(availableLists.map((list) => list.id));
      setListsFetched(true);
      setTempConnectionId(connection.id);
    } catch (err: any) {
      const errorMessage =
        err.message || 'Failed to validate API key. Please try again.';

      setError(errorMessage);
    } finally {
      setFetchingLists(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!selectedEspType || !token) {
      return;
    }

    if (!listsFetched) {
      // If lists haven't been fetched yet, validate and fetch them first
      if (!validateForm()) {
        return;
      }
      await handleValidateAndFetchLists();
      return;
    }

    if (selectedListIds.length === 0) {
      setError('Please select at least one list to sync');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!token || !tempConnectionId) {
        throw new Error('Connection not found. Please start over.');
      }

      // Update selected lists for the connection
      await espConnectionApi.updateSelectedLists(
        tempConnectionId,
        { selectedListIds },
        token,
        () => {
          router.push('/login');
        }
      );

      // Automatically trigger sync
      try {
        await espConnectionApi.triggerSync(tempConnectionId, token, () => {
          router.push('/login');
        });
      } catch (syncError) {
        // If sync trigger fails, still redirect to detail page
        // The user can manually trigger sync from there
        console.error('Failed to trigger sync:', syncError);
      }

      // Redirect to ESP detail page
      router.push(`/dashboard/esp/${tempConnectionId}`);
    } catch (err: any) {
      setError(
        err.message || 'Failed to create ESP connection. Please try again.'
      );
      setLoading(false);
    }
  };

  // ESP Type Selection View
  if (!selectedEspType) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold mb-2">Connect New ESP</h1>
          <p className="text-muted-foreground">
            Select your email service provider to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {espConfigs.map((esp) => (
            <Card
              key={esp.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleEspTypeSelect(esp.id)}
            >
              <CardHeader>
                <CardTitle className="text-xl">{esp.name}</CardTitle>
                <CardDescription>{esp.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEspTypeSelect(esp.id);
                  }}
                >
                  Select {esp.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Form View
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={handleBack}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to ESP Selection
        </Button>
        <h1 className="text-3xl font-semibold mb-2">
          Connect {getEspConfig(selectedEspType)?.name || selectedEspType}
        </h1>
        <p className="text-muted-foreground">
          Enter your API credentials to connect your account
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
          <CardDescription>
            {hasOAuth
              ? 'Connect your account securely using OAuth'
              : 'Please provide your API key'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasOAuth ? (
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary font-medium mb-2">
                  Connect with OAuth
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your{' '}
                  {getEspConfig(selectedEspType)?.name || selectedEspType}{' '}
                  account securely using OAuth. No API keys needed!
                </p>
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 mb-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleOAuthConnect}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect with OAuth'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!listsFetched ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="apiKey" className="text-sm font-medium">
                      API Key <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      disabled={loading || fetchingLists}
                      className={
                        validationErrors.apiKey ? 'border-destructive' : ''
                      }
                    />
                    {validationErrors.apiKey && (
                      <p className="text-sm text-destructive">
                        {validationErrors.apiKey}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={loading || fetchingLists}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || fetchingLists || !apiKey.trim()}
                      className="flex-1"
                    >
                      {fetchingLists ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        'Continue to select lists'
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        API key validated successfully. Select which lists to
                        sync:
                      </p>
                    </div>

                    <ListSelector
                      lists={lists}
                      selectedListIds={selectedListIds}
                      onSelectionChange={setSelectedListIds}
                      loading={false}
                      error={null}
                    />

                    {error && (
                      <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={loading}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || selectedListIds.length === 0}
                        className="flex-1"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          'Connect & Sync'
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
