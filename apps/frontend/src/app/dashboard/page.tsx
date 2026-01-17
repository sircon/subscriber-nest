'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface EspConnection {
  id: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
}

const providerNames: Record<string, string> = {
  kit: 'Kit',
  beehiiv: 'beehiiv',
  mailchimp: 'Mailchimp',
};

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [connections, setConnections] = useState<EspConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/esp-connections`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch ESP connections');
        }

        const data = await response.json();
        setConnections(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [token]);

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
                    <CardTitle>{providerNames[connection.provider] || connection.provider}</CardTitle>
                    <CardDescription>
                      {connection.isActive ? 'Active' : 'Inactive'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connected {new Date(connection.createdAt).toLocaleDateString()}
                    </p>
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
