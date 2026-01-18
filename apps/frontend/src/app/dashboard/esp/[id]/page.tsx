'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi, subscriberApi, EspConnection, PaginatedSubscribers, SyncHistory } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Download } from 'lucide-react';

export default function EspDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const [connection, setConnection] = useState<EspConnection | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [subscribers, setSubscribers] = useState<PaginatedSubscribers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unmask state management
  const [unmaskedEmails, setUnmaskedEmails] = useState<Map<string, string>>(new Map());
  const [unmaskingIds, setUnmaskingIds] = useState<Set<string>>(new Set());
  const [unmaskErrors, setUnmaskErrors] = useState<Map<string, string>>(new Map());

  // Export state management
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Pagination state from URL
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = parseInt(searchParams.get('limit') || '50', 10);

  useEffect(() => {
    async function fetchData() {
      if (!token || !id) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch connection, sync history, and subscribers in parallel
        const [connectionData, syncData, subscribersData] = await Promise.all([
          espConnectionApi.getConnection(id as string, token),
          espConnectionApi.getSyncHistory(id as string, token, undefined, 1),
          espConnectionApi.getSubscribers(id as string, token, undefined, currentPage, itemsPerPage),
        ]);

        setConnection(connectionData);
        setSyncHistory(syncData);
        setSubscribers(subscribersData);
      } catch (err) {
        console.error('Error fetching ESP detail data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ESP connection details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token, id, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/dashboard/esp/${id}?${params.toString()}`);
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
    return (
      <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {status}
      </Badge>
    );
  };

  const getSyncStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      idle: 'bg-gray-500',
      syncing: 'bg-blue-500',
      synced: 'bg-green-500',
      error: 'bg-red-500',
    };
    return (
      <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {status}
      </Badge>
    );
  };

  const handleUnmaskToggle = async (subscriberId: string) => {
    // If already unmasked, just re-mask by removing from map
    if (unmaskedEmails.has(subscriberId)) {
      const newUnmaskedEmails = new Map(unmaskedEmails);
      newUnmaskedEmails.delete(subscriberId);
      setUnmaskedEmails(newUnmaskedEmails);
      
      // Clear any error for this subscriber
      const newErrors = new Map(unmaskErrors);
      newErrors.delete(subscriberId);
      setUnmaskErrors(newErrors);
      return;
    }

    // Otherwise, unmask the email
    if (!token) return;

    // Set loading state
    setUnmaskingIds((prev) => new Set(prev).add(subscriberId));
    
    // Clear previous error if any
    const newErrors = new Map(unmaskErrors);
    newErrors.delete(subscriberId);
    setUnmaskErrors(newErrors);

    try {
      const response = await subscriberApi.unmaskEmail(subscriberId, token);
      
      // Update unmasked emails map
      const newUnmaskedEmails = new Map(unmaskedEmails);
      newUnmaskedEmails.set(subscriberId, response.email);
      setUnmaskedEmails(newUnmaskedEmails);
    } catch (err) {
      console.error('Error unmasking email:', err);
      
      // Store error message for this subscriber
      const errorMessage = err instanceof Error ? err.message : 'Failed to unmask email';
      const newErrorMap = new Map(unmaskErrors);
      newErrorMap.set(subscriberId, errorMessage);
      setUnmaskErrors(newErrorMap);
    } finally {
      // Clear loading state
      setUnmaskingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(subscriberId);
        return newSet;
      });
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    if (!token || !id) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const { blob, filename } = await espConnectionApi.exportSubscribers(
        id as string,
        format,
        token,
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to export subscribers';
      setExportError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!connection || !subscribers) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">ESP connection not found</p>
        </div>
      </div>
    );
  }

  // Calculate subscriber counts by status
  const activeCount = subscribers.data.filter((s) => s.status === 'active').length;
  const unsubscribedCount = subscribers.data.filter((s) => s.status === 'unsubscribed').length;
  const lastSync = syncHistory[0];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{connection.espType}</h1>
          <p className="text-gray-600">{connection.publicationId}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {exportError && (
            <p className="text-sm text-red-600">{exportError}</p>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: List Size */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              List Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{subscribers.total}</p>
          </CardContent>
        </Card>

        {/* Card 2: Last Sync */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Last Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastSync ? (
              <div>
                <p className="text-lg font-semibold">
                  {formatDate(lastSync.completedAt)}
                </p>
                <Badge className={`mt-2 ${lastSync.status === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                  {lastSync.status}
                </Badge>
              </div>
            ) : (
              <p className="text-lg font-semibold text-gray-400">Never</p>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Connection Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              {getSyncStatusBadge(connection.syncStatus)}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {connection.status}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Active vs Unsubscribed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Subscriber Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-semibold text-green-600">{activeCount}</span> Active
              </p>
              <p className="text-sm">
                <span className="font-semibold text-gray-600">{unsubscribedCount}</span> Unsubscribed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscribers</CardTitle>
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No subscribers found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscribers.data.map((subscriber) => {
                    const isUnmasked = unmaskedEmails.has(subscriber.id);
                    const isUnmasking = unmaskingIds.has(subscriber.id);
                    const unmaskError = unmaskErrors.get(subscriber.id);
                    
                    return (
                      <TableRow key={subscriber.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex flex-col gap-1">
                            <span>
                              {isUnmasked ? unmaskedEmails.get(subscriber.id) : subscriber.maskedEmail}
                            </span>
                            {unmaskError && (
                              <span className="text-xs text-red-600">
                                {unmaskError}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{subscriber.firstName || '-'}</TableCell>
                        <TableCell>{subscriber.lastName || '-'}</TableCell>
                        <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                        <TableCell>{formatDate(subscriber.subscribedAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnmaskToggle(subscriber.id)}
                            disabled={isUnmasking}
                          >
                            {isUnmasking ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Loading...
                              </>
                            ) : isUnmasked ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Mask
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Unmask
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {subscribers.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, subscribers.total)} of{' '}
                {subscribers.total} subscribers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {subscribers.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === subscribers.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
