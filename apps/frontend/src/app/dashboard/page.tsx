'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  DashboardStats,
  PaginatedDashboardSubscribers,
} from '@/lib/api';
import { getEspName, EspType } from '@/lib/esp-config';
import { Pagination } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 50;

function WelcomeOverlay({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    // Auto-dismiss after 2 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
        <div>
          <h2 className="text-2xl font-semibold mb-2">
            Welcome to Audience Safe!
          </h2>
          <p className="text-muted-foreground">Setting up your dashboard...</p>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subscribers, setSubscribers] =
    useState<PaginatedDashboardSubscribers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Check for welcome param
    const welcome = searchParams.get('welcome');
    if (welcome === 'true') {
      setShowWelcome(true);
      // Remove the welcome param from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const pageParam = searchParams.get('page');
    const parsedPage = Number.parseInt(pageParam ?? '1', 10);
    setCurrentPage(Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage);
  }, [searchParams]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch stats and subscribers in parallel
        const [statsData, subscribersData] = await Promise.all([
          dashboardApi.getStats(token, () => router.push('/login')),
          dashboardApi.getSubscribers(
            token,
            () => router.push('/login'),
            currentPage,
            ITEMS_PER_PAGE
          ),
        ]);

        setStats(statsData);
        setSubscribers(subscribersData);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      unsubscribed: 'bg-gray-500',
      bounced: 'bg-red-500',
    };
    const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {capitalizedStatus}
      </Badge>
    );
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/dashboard?${params.toString()}`);
  };

  // Show welcome overlay when coming from onboarding
  if (showWelcome) {
    return (
      <>
        <WelcomeOverlay onComplete={() => setShowWelcome(false)} />
        <DashboardLoadingSkeleton />
      </>
    );
  }

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Monitor your ESP connections and subscriber activity
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

      {/* All Subscribers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscribers</CardTitle>
          <CardDescription>
            Subscribers from all ESP connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscribed At</TableHead>
                  <TableHead>Connection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers && subscribers.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-500"
                    >
                      No subscribers found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscribers?.data.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell className="font-mono text-sm">
                        {subscriber.maskedEmail}
                      </TableCell>
                      <TableCell>{subscriber.firstName || '-'}</TableCell>
                      <TableCell>{subscriber.lastName || '-'}</TableCell>
                      <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                      <TableCell>
                        {formatDate(subscriber.subscribedAt)}
                      </TableCell>
                      <TableCell>
                        {getEspName(subscriber.espType as EspType)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {subscribers && (
            <Pagination
              currentPage={currentPage}
              totalPages={subscribers.totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={subscribers.total}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardLoadingSkeleton() {
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
