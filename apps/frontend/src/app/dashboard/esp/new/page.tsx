'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type EspType = 'beehiiv' | 'kit' | 'mailchimp';

const espTypes: { id: EspType; name: string; description: string }[] = [
  {
    id: 'beehiiv',
    name: 'beehiiv',
    description: 'Connect your beehiiv account to sync subscribers',
  },
  {
    id: 'kit',
    name: 'Kit',
    description: 'Connect your Kit account to sync subscribers',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Connect your Mailchimp account to sync subscribers',
  },
];

export default function NewEspConnectionPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [selectedEspType, setSelectedEspType] = useState<EspType | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [publicationId, setPublicationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    apiKey?: string;
    publicationId?: string;
  }>({});

  const handleEspTypeSelect = (espType: EspType) => {
    setSelectedEspType(espType);
    setError(null);
    setValidationErrors({});
  };

  const handleBack = () => {
    setSelectedEspType(null);
    setApiKey('');
    setPublicationId('');
    setError(null);
    setValidationErrors({});
  };

  const validateForm = (): boolean => {
    const errors: { apiKey?: string; publicationId?: string } = {};

    if (!apiKey.trim()) {
      errors.apiKey = 'API Key is required';
    }

    if (!publicationId.trim()) {
      errors.publicationId = 'Publication ID is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        },
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
    } catch (err: any) {
      setError(err.message || 'Failed to create ESP connection. Please try again.');
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {espTypes.map((esp) => (
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
        <h1 className="text-3xl font-semibold mb-2">Connect {espTypes.find((e) => e.id === selectedEspType)?.name}</h1>
        <p className="text-muted-foreground">
          Enter your API credentials to connect your account
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
          <CardDescription>
            Please provide your API key and publication ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={loading}
                className={validationErrors.apiKey ? 'border-destructive' : ''}
              />
              {validationErrors.apiKey && (
                <p className="text-sm text-destructive">{validationErrors.apiKey}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="publicationId" className="text-sm font-medium">
                Publication ID <span className="text-destructive">*</span>
              </label>
              <Input
                id="publicationId"
                type="text"
                placeholder="Enter your publication ID"
                value={publicationId}
                onChange={(e) => setPublicationId(e.target.value)}
                disabled={loading}
                className={validationErrors.publicationId ? 'border-destructive' : ''}
              />
              {validationErrors.publicationId && (
                <p className="text-sm text-destructive">
                  {validationErrors.publicationId}
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
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
