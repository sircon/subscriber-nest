'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';

export default function AccountDeletionPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [connections, setConnections] = useState<
    Array<{ id: string; espType: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated or if deletion not requested
    if (!user || !user.deleteRequestedAt) {
      router.push('/dashboard');
      return;
    }

    // Fetch ESP connections for export
    const fetchConnections = async () => {
      if (!token) return;

      try {
        const data = await espConnectionApi.getUserConnections(token);
        setConnections(data);
      } catch (err) {
        console.error('Error fetching connections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [user, token, router]);

  const handleExport = async (
    connectionId: string,
    format: 'csv' | 'json' | 'xlsx'
  ) => {
    if (!token) return;

    setExporting(`${connectionId}-${format}`);
    try {
      const { blob, filename } = await espConnectionApi.exportSubscribers(
        connectionId,
        format,
        token
      );

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting subscribers:', err);
      alert('Failed to export subscribers. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  if (!user || !user.deleteRequestedAt) {
    return null;
  }

  const deletionDate =
    typeof user.deleteRequestedAt === 'string'
      ? new Date(user.deleteRequestedAt)
      : user.deleteRequestedAt;
  const deletionDeadline = new Date(deletionDate);
  deletionDeadline.setDate(deletionDeadline.getDate() + 30);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Account Deletion in Progress
            </CardTitle>
            <CardDescription>
              Your account deletion was requested on{' '}
              {deletionDate.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <div className="space-y-2">
                <p className="font-semibold">
                  Your account will be permanently deleted on{' '}
                  {deletionDeadline.toLocaleDateString()}.
                </p>
                <p>
                  You have{' '}
                  {Math.ceil(
                    (deletionDeadline.getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                  )}{' '}
                  days remaining to export your data.
                </p>
              </div>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Export Your Data</h3>
              <p className="text-sm text-muted-foreground">
                During the 30-day grace period, you can export your subscriber
                data. After the deadline, all data will be permanently deleted.
              </p>

              {loading ? (
                <div className="text-sm text-muted-foreground">
                  Loading connections...
                </div>
              ) : connections.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No ESP connections found.
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div>
                        <h4 className="font-medium">
                          {connection.espType} Connection
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Export subscribers from this connection
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExport(connection.id, 'csv')}
                          disabled={exporting === `${connection.id}-csv`}
                        >
                          {exporting === `${connection.id}-csv`
                            ? 'Exporting...'
                            : 'Export CSV'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExport(connection.id, 'json')}
                          disabled={exporting === `${connection.id}-json`}
                        >
                          {exporting === `${connection.id}-json`
                            ? 'Exporting...'
                            : 'Export JSON'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExport(connection.id, 'xlsx')}
                          disabled={exporting === `${connection.id}-xlsx`}
                        >
                          {exporting === `${connection.id}-xlsx`
                            ? 'Exporting...'
                            : 'Export Excel'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                If you need to cancel the deletion request, please contact
                support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
