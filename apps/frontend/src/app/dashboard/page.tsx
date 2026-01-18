'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi, EspConnection } from '@/lib/api';

const providerNames: Record<string, string> = {
  kit: 'Kit',
  beehiiv: 'beehiiv',
  mailchimp: 'Mailchimp',
};

const syncStatusLabels: Record<string, string> = {
  idle: 'Not synced yet',
  syncing: 'Syncing...',
  synced: 'Synced',
  error: 'Sync failed',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [connections, setConnections] = useState<EspConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchConnections = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await espConnectionApi.getUserConnections(token, () => {
          // Handle 401: redirect to login
          router.push('/login');
        });
        setConnections(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [token, router]);

  const handleSync = async (connectionId: string) => {
    if (!token) return;

    // Clear any previous error for this connection
    setSyncErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[connectionId];
      return newErrors;
    });

    // Optimistically update the connection status to 'syncing'
    setConnections((prev) =>
      prev.map((conn) =>
        conn.id === connectionId ? { ...conn, syncStatus: 'syncing' as const } : conn
      )
    );

    try {
      const result = await espConnectionApi.triggerSync(connectionId, token, () => {
        router.push('/login');
      });
      
      // Update the connection with the response from the server
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === connectionId ? result.connection : conn
        )
      );
    } catch (err) {
      // Revert optimistic update on error
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === connectionId ? { ...conn, syncStatus: 'error' as const } : conn
        )
      );
      
      // Store error message
      setSyncErrors((prev) => ({
        ...prev,
        [connectionId]: err instanceof Error ? err.message : 'Failed to trigger sync',
      }));
    }
  };

  const getSyncButtonText = (syncStatus: string) => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Retry Sync';
      case 'synced':
        return 'Sync Again';
      default:
        return 'Sync Now';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-secondary rounded w-1/3"></div>
            <div className="h-4 bg-secondary rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="h-32 bg-secondary rounded"></div>
              <div className="h-32 bg-secondary rounded"></div>
              <div className="h-32 bg-secondary rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to SubscriberNest</h1>
          <p className="text-muted-foreground">
            {user?.email ? `Signed in as ${user.email}` : 'Loading...'}
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Connected ESPs</h2>
          {connections.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No ESP connections yet. Connect your first ESP to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connections.map((connection) => (
                <Card key={connection.id}>
                  <CardHeader>
                    <CardTitle>{providerNames[connection.espType] || connection.espType}</CardTitle>
                    <CardDescription>
                      Status: {connection.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Connected {new Date(connection.createdAt).toLocaleDateString()}
                      </p>
                      
                      <div className="mt-2">
                        <p className="text-sm font-medium">
                          Sync Status: {syncStatusLabels[connection.syncStatus] || connection.syncStatus}
                        </p>
                        {connection.lastSyncedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last synced {new Date(connection.lastSyncedAt).toLocaleDateString()} at{' '}
                            {new Date(connection.lastSyncedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {syncErrors[connection.id] && (
                      <div className="text-sm text-destructive">
                        {syncErrors[connection.id]}
                      </div>
                    )}

                    <Button
                      onClick={() => handleSync(connection.id)}
                      disabled={connection.syncStatus === 'syncing'}
                      className="w-full"
                      variant={connection.syncStatus === 'error' ? 'destructive' : 'default'}
                    >
                      {getSyncButtonText(connection.syncStatus)}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
