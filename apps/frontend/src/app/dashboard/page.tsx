'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import {
  dashboardApi,
  espConnectionApi,
  DashboardStats,
  SyncHistory,
} from '@/lib/api';

const providerNames: Record<string, string> = {
  kit: 'Kit',
  beehiiv: 'beehiiv',
  mailchimp: 'Mailchimp',
};

interface SyncHistoryWithEsp extends SyncHistory {
  espName: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryWithEsp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch stats and connections in parallel
        const [statsData, connections] = await Promise.all([
          dashboardApi.getStats(token, () => router.push('/login')),
          espConnectionApi.getUserConnections(token, () =>
            router.push('/login')
          ),
        ]);

        setStats(statsData);

        // Fetch sync history for all connections
        if (connections.length > 0) {
          const syncHistoryPromises = connections.map(
            (conn) =>
              espConnectionApi
                .getSyncHistory(conn.id, token, () => router.push('/login'), 50)
                .then((history) =>
                  history.map((h) => ({
                    ...h,
                    espName: `${providerNames[conn.espType] || conn.espType} (${conn.publicationId})`,
                  }))
                )
                .catch(() => []) // Silently handle errors for individual connections
          );

          const allSyncHistory = await Promise.all(syncHistoryPromises);

          // Flatten and sort by startedAt DESC
          const mergedHistory = allSyncHistory
            .flat()
            .sort(
              (a, b) =>
                new Date(b.startedAt).getTime() -
                new Date(a.startedAt).getTime()
            )
            .slice(0, 50); // Keep only top 50

          setSyncHistory(mergedHistory);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, router]);

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return formatDateTime(dateString);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-secondary rounded"></div>
            <div className="h-32 bg-secondary rounded"></div>
            <div className="h-32 bg-secondary rounded"></div>
          </div>
          <div className="h-64 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Monitor your ESP connections and sync activity
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardDescription>Total ESPs</CardDescription>
            <CardTitle className="text-4xl">
              {stats?.totalEspConnections || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Total Subscribers</CardDescription>
            <CardTitle className="text-4xl">
              {stats?.totalSubscribers || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Last Sync</CardDescription>
            <CardTitle className="text-2xl">
              {formatLastSync(stats?.lastSyncTime || null)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sync History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync History</CardTitle>
          <CardDescription>
            Most recent sync operations across all ESP connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sync history yet. Sync your ESP connections to see activity
              here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ESP Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="font-medium">
                        {history.espName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            history.status === 'success'
                              ? 'default'
                              : 'destructive'
                          }
                          className={
                            history.status === 'success'
                              ? 'bg-green-500 hover:bg-green-600'
                              : ''
                          }
                        >
                          {history.status.charAt(0).toUpperCase() +
                            history.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(history.startedAt)}</TableCell>
                      <TableCell>
                        {formatDateTime(history.completedAt)}
                      </TableCell>
                      <TableCell>
                        {history.status === 'failed' && history.errorMessage ? (
                          <span
                            className="text-sm text-destructive max-w-xs truncate block"
                            title={history.errorMessage}
                          >
                            {history.errorMessage}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
