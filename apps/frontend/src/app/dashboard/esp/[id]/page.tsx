'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  espConnectionApi,
  subscriberApi,
  billingApi,
  EspConnection,
  PaginatedSubscribers,
  SubscriberStats,
  SyncHistory,
  BillingStatusResponse,
} from '@/lib/api';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Eye,
  EyeOff,
  Loader2,
  Download,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ListSelector } from '@/components/ListSelector';
import { List } from '@/lib/api';
import { useSyncPolling } from '@/hooks/useSyncPolling';

export default function EspDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, user } = useAuth();

  const [connection, setConnection] = useState<EspConnection | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [subscribers, setSubscribers] = useState<PaginatedSubscribers | null>(
    null
  );
  const [subscriberStats, setSubscriberStats] =
    useState<SubscriberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unmask state management
  const [unmaskedEmails, setUnmaskedEmails] = useState<Map<string, string>>(
    new Map()
  );
  const [unmaskingIds, setUnmaskingIds] = useState<Set<string>>(new Set());
  const [unmaskErrors, setUnmaskErrors] = useState<Map<string, string>>(
    new Map()
  );

  // Export state management
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Sync state management
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Subscription status state
  const [hasActiveSubscription, setHasActiveSubscription] = useState<
    boolean | null
  >(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // OAuth success message state
  const [showOAuthSuccess, setShowOAuthSuccess] = useState(false);

  // Disconnect dialog state
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // List management state
  const [showManageLists, setShowManageLists] = useState(false);
  const [availableLists, setAvailableLists] = useState<List[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const [isUpdatingLists, setIsUpdatingLists] = useState(false);
  const [listUpdateError, setListUpdateError] = useState<string | null>(null);
  const [draftSelectedListIds, setDraftSelectedListIds] = useState<string[]>(
    []
  );
  const [showListSaveToast, setShowListSaveToast] = useState(false);
  const lastSyncedAtRef = useRef<string | null>(null);
  const lastCompletedSyncRef = useRef<SyncHistory | null>(null);

  // Pagination state from URL
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = parseInt(searchParams.get('limit') || '50', 10);

  useEffect(() => {
    if (!id) return;
    const params = new URLSearchParams(searchParams.toString());
    let shouldReplace = false;

    const manageListsRequested = searchParams.get('manageLists') === '1';
    const deleteConnectionRequested =
      searchParams.get('deleteConnection') === '1';

    if (manageListsRequested && token && connection) {
      setShowManageLists(true);
      setDraftSelectedListIds(getSelectedListIds());
      setLoadingLists(true);
      setListsError(null);
      setListUpdateError(null);

      espConnectionApi
        .getLists(id as string, token)
        .then((lists) => {
          setAvailableLists(lists);
        })
        .catch((err) => {
          console.error('Error fetching available lists:', err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to fetch available lists';
          setListsError(errorMessage);
        })
        .finally(() => {
          setLoadingLists(false);
        });

      params.delete('manageLists');
      shouldReplace = true;
    }

    if (deleteConnectionRequested) {
      setShowDisconnectDialog(true);
      params.delete('deleteConnection');
      shouldReplace = true;
    }

    if (shouldReplace) {
      const query = params.toString();
      router.replace(
        query ? `/dashboard/esp/${id}?${query}` : `/dashboard/esp/${id}`
      );
    }
  }, [connection, id, router, searchParams, token]);

  useEffect(() => {
    async function fetchData() {
      if (!token || !id) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch connection, sync history, and subscribers in parallel
        const [connectionData, syncData, subscribersData, statsData] =
          await Promise.all([
            espConnectionApi.getConnection(id as string, token),
            espConnectionApi.getSyncHistory(id as string, token, undefined, 1),
            espConnectionApi.getSubscribers(
              id as string,
              token,
              undefined,
              currentPage,
              itemsPerPage
            ),
            espConnectionApi
              .getSubscriberStats(id as string, token)
              .catch((err) => {
                console.error('Error fetching subscriber stats:', err);
                return null;
              }),
          ]);

        setConnection(connectionData);
        setSyncHistory(syncData);
        setSubscribers(subscribersData);
        setSubscriberStats(statsData);
      } catch (err) {
        console.error('Error fetching ESP detail data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load ESP connection details'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token, id, currentPage, itemsPerPage]);

  const refreshSubscriberStats = useCallback(async () => {
    if (!token || !id) return;
    try {
      const statsData = await espConnectionApi.getSubscriberStats(
        id as string,
        token
      );
      setSubscriberStats(statsData);
    } catch (err) {
      console.error('Error refreshing subscriber stats:', err);
    }
  }, [id, token]);

  const pollSyncStatus = useCallback(async () => {
    if (!token || !id) return;

    const [connectionData, syncData] = await Promise.all([
      espConnectionApi.getConnection(id as string, token),
      espConnectionApi.getSyncHistory(id as string, token, undefined, 1),
    ]);

    setConnection(connectionData);
    setSyncHistory(syncData);

    const latestSync = syncData[0];
    const completedAt = latestSync?.completedAt ?? null;
    const shouldRefreshStats =
      connectionData.syncStatus !== 'syncing' &&
      latestSync?.status === 'success' &&
      completedAt &&
      completedAt !== lastSyncedAtRef.current;
    const shouldRefreshSubscribers = shouldRefreshStats;

    if (shouldRefreshSubscribers) {
      try {
        const subscribersData = await espConnectionApi.getSubscribers(
          id as string,
          token,
          undefined,
          currentPage,
          itemsPerPage
        );
        setSubscribers(subscribersData);
      } catch (err) {
        console.error('Error refreshing subscribers:', err);
      }
    }

    if (shouldRefreshStats) {
      lastSyncedAtRef.current = completedAt;
      lastCompletedSyncRef.current = latestSync;
      await refreshSubscriberStats();
    }
  }, [currentPage, id, itemsPerPage, refreshSubscriberStats, token]);

  useSyncPolling({
    enabled: Boolean(token && id),
    isSyncing: connection?.syncStatus === 'syncing',
    onPoll: pollSyncStatus,
  });

  const getSelectedListIds = (): string[] => {
    if (connection?.publicationIds && connection.publicationIds.length > 0) {
      return connection.publicationIds;
    }
    if (connection?.publicationId) {
      return [connection.publicationId];
    }
    return [];
  };

  // Check subscription status on page load
  useEffect(() => {
    async function checkSubscription() {
      if (!token) {
        setCheckingSubscription(false);
        return;
      }

      setCheckingSubscription(true);
      try {
        const status: BillingStatusResponse =
          await billingApi.getBillingStatus(token);
        setHasActiveSubscription(status.hasActiveSubscription);
      } catch (err) {
        console.error('Error checking subscription status:', err);
        // Default to false if check fails (fail-safe)
        setHasActiveSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    }

    checkSubscription();
  }, [token]);

  // Check for OAuth success query parameter
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth');
    if (oauthSuccess === 'success') {
      setShowOAuthSuccess(true);
      // Remove the query parameter from URL after showing the message
      const params = new URLSearchParams(searchParams.toString());
      params.delete('oauth');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
      // Hide the message after 5 seconds
      const timer = setTimeout(() => {
        setShowOAuthSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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
    const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {capitalizedStatus}
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
    const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <Badge className={`${colors[status] || 'bg-gray-500'} text-white`}>
        {capitalizedStatus}
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to unmask email';
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to export subscribers';
      setExportError(errorMessage);

      // Clear error after 5 seconds
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSync = async () => {
    if (!token || !id) return;

    const selectedListIds =
      connection?.publicationIds ||
      (connection?.publicationId ? [connection.publicationId] : []);

    if (selectedListIds.length === 0) {
      setSyncError(
        'No lists selected. Click "Manage Lists" to select lists to sync.'
      );
      setTimeout(() => setSyncError(null), 5000);
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Trigger sync - response includes updated connection
      const response = await espConnectionApi.triggerSync(id as string, token);

      // Update connection state with the response
      setConnection(response.connection);

      // Optionally refresh sync history after a short delay to see the new sync record
      const refreshSyncHistory = async (attempt: number) => {
        try {
          const syncData = await espConnectionApi.getSyncHistory(
            id as string,
            token,
            undefined,
            1
          );
          setSyncHistory(syncData);

          const latestSync = syncData[0];
          if (latestSync?.status === 'success' && latestSync.completedAt) {
            await refreshSubscriberStats();
            return;
          }
        } catch (err) {
          // Silently fail - sync history refresh is optional
          console.error('Error refreshing sync history:', err);
        }

        if (attempt < 4) {
          setTimeout(() => {
            void refreshSyncHistory(attempt + 1);
          }, 2000);
        }
      };

      setTimeout(() => {
        void refreshSyncHistory(0);
      }, 1000);
    } catch (err) {
      console.error('Error triggering sync:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to trigger sync';
      setSyncError(errorMessage);

      // Clear error after 5 seconds
      setTimeout(() => setSyncError(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!token || !id) return;

    setIsDisconnecting(true);
    setDisconnectError(null);

    try {
      await espConnectionApi.deleteConnection(id as string, token);
      // Redirect to dashboard after successful deletion
      router.push('/dashboard');
    } catch (err) {
      console.error('Error disconnecting ESP:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to disconnect ESP connection';
      setDisconnectError(errorMessage);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleUpdateSelectedLists = async (selectedListIds: string[]) => {
    if (!token || !id) return;

    setIsUpdatingLists(true);
    setListUpdateError(null);

    try {
      const updatedConnection = await espConnectionApi.updateSelectedLists(
        id as string,
        { selectedListIds },
        token
      );
      setConnection(updatedConnection);
      setShowManageLists(false);
      setShowListSaveToast(true);
      setTimeout(() => {
        setShowListSaveToast(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating selected lists:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update selected lists';
      setListUpdateError(errorMessage);
      // Clear error after 5 seconds
      setTimeout(() => setListUpdateError(null), 5000);
    } finally {
      setIsUpdatingLists(false);
    }
  };

  // Helper function to get list names for display
  const getListNames = (): string[] => {
    if (connection?.listNames && connection.listNames.length > 0) {
      return connection.listNames;
    }
    // Fallback to IDs if names not available
    if (connection?.publicationIds && connection.publicationIds.length > 0) {
      return connection.publicationIds;
    }
    if (connection?.publicationId) {
      return [connection.publicationId];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary/60 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-secondary/60 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-secondary/60 rounded"></div>
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
  const activeCount =
    subscriberStats?.active ??
    subscribers.data.filter((s) => s.status === 'active').length;
  const unsubscribedCount =
    subscriberStats?.unsubscribed ??
    subscribers.data.filter((s) => s.status === 'unsubscribed').length;
  const totalCount = subscriberStats?.total ?? subscribers.total;
  const lastSync = syncHistory[0]?.completedAt
    ? syncHistory[0]
    : lastCompletedSyncRef.current;
  const selectedListIds = getSelectedListIds();
  const hasListChanges =
    draftSelectedListIds.length !== selectedListIds.length ||
    selectedListIds.some((id) => !draftSelectedListIds.includes(id));

  return (
    <div className="p-8">
      {showListSaveToast && (
        <Alert className="fixed top-4 right-4 z-50 w-[min(24rem,calc(100%-2rem))] border-green-500/60 bg-card shadow-lg">
          <AlertTitle className="text-green-600">Lists updated</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Your selected lists have been saved.
          </AlertDescription>
        </Alert>
      )}
      {/* OAuth Success Message */}
      {showOAuthSuccess && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <AlertTitle className="text-green-800">
            Connection Successful!
          </AlertTitle>
          <AlertDescription className="text-green-700">
            Your OAuth connection has been established successfully. Your
            subscribers are being synced.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{connection.espType}</h1>
          <div className="flex items-center gap-2 mt-1">
            {(() => {
              const listNames = getListNames();
              if (listNames.length > 0) {
                return (
                  <p className="text-gray-600">
                    {listNames.length} list{listNames.length !== 1 ? 's' : ''}
                    {listNames.length <= 3 && (
                      <span className="ml-1">: {listNames.join(', ')}</span>
                    )}
                  </p>
                );
              }
              return null;
            })()}
            <Badge
              variant={
                connection.authMethod === 'oauth' ? 'default' : 'secondary'
              }
            >
              {connection.authMethod === 'oauth' ? 'OAuth' : 'API Key'}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleSync}
                      disabled={
                        checkingSubscription ||
                        isSyncing ||
                        connection.syncStatus === 'syncing' ||
                        hasActiveSubscription === false
                      }
                      variant="outline"
                    >
                      {checkingSubscription ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : isSyncing || connection.syncStatus === 'syncing' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {hasActiveSubscription === false && (
                  <TooltipContent>
                    <p>Active subscription required to sync</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                      <Button
                        disabled={
                          checkingSubscription ||
                          isExporting ||
                          (hasActiveSubscription === false &&
                            !user?.deleteRequestedAt)
                        }
                      >
                          {checkingSubscription ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Checking...
                            </>
                          ) : isExporting ? (
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
                  </span>
                </TooltipTrigger>
                {hasActiveSubscription === false && !user?.deleteRequestedAt && (
                  <TooltipContent>
                    <p>Active subscription required to export</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          {syncError && <p className="text-sm text-red-600">{syncError}</p>}
          {exportError && <p className="text-sm text-red-600">{exportError}</p>}
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
            <p className="text-3xl font-bold">{totalCount}</p>
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
                <Badge
                  className={`mt-2 ${lastSync.status === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}
                >
                  {lastSync.status.charAt(0).toUpperCase() +
                    lastSync.status.slice(1)}
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
              {connection.status.charAt(0).toUpperCase() +
                connection.status.slice(1)}
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
                <span className="font-semibold text-green-600">
                  {activeCount}
                </span>{' '}
                Active
              </p>
              <p className="text-sm">
                <span className="font-semibold text-gray-600">
                  {unsubscribedCount}
                </span>{' '}
                Unsubscribed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manage Lists Dialog */}
      <Dialog
        open={showManageLists}
        onOpenChange={(open) => {
          setShowManageLists(open);
          if (!open) {
            setListsError(null);
            setListUpdateError(null);
            setDraftSelectedListIds([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Lists</DialogTitle>
            <DialogDescription>
              Select which lists to sync from this ESP connection. Changes are
              saved when you click Save.
            </DialogDescription>
          </DialogHeader>
          {listUpdateError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{listUpdateError}</AlertDescription>
            </Alert>
          )}
          <ListSelector
            lists={availableLists}
            selectedListIds={draftSelectedListIds}
            onSelectionChange={setDraftSelectedListIds}
            loading={loadingLists}
            error={listsError}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowManageLists(false);
                setListsError(null);
                setListUpdateError(null);
                setDraftSelectedListIds([]);
              }}
              disabled={isUpdatingLists}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleUpdateSelectedLists(draftSelectedListIds)}
              disabled={isUpdatingLists || !hasListChanges}
            >
              {isUpdatingLists ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OAuth Connection Details Card */}
      {connection.authMethod === 'oauth' && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>OAuth Connection Details</CardTitle>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDisconnectDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Token Expiry */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Token Expires At
                </p>
                <p className="text-base">
                  {connection.tokenExpiresAt
                    ? formatDate(connection.tokenExpiresAt)
                    : 'Not available'}
                </p>
              </div>

              {/* Last Refresh */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Last Refreshed
                </p>
                <p className="text-base">
                  {connection.lastValidatedAt
                    ? formatDate(connection.lastValidatedAt)
                    : 'Never'}
                </p>
              </div>

              {/* Connected Lists */}
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Connected Lists
                </p>
                {(() => {
                  const listNames = getListNames();
                  if (listNames.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-2">
                        {listNames.map((listName, index) => (
                          <Badge key={index} variant="outline">
                            {listName}
                          </Badge>
                        ))}
                      </div>
                    );
                  }
                  return <p className="text-sm text-gray-500">No lists</p>;
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect ESP Connection</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this ESP connection? This
              action will permanently delete the connection and all associated
              subscribers and sync history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {disconnectError && (
            <Alert variant="destructive">
              <AlertDescription>{disconnectError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisconnectDialog(false);
                setDisconnectError(null);
              }}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-500"
                    >
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
                          <div className="flex items-center gap-2">
                            <span>
                              {isUnmasked
                                ? unmaskedEmails.get(subscriber.id)
                                : subscriber.maskedEmail}
                            </span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() =>
                                      handleUnmaskToggle(subscriber.id)
                                    }
                                    disabled={isUnmasking}
                                  >
                                    {isUnmasking ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isUnmasked ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isUnmasking
                                    ? 'Loading...'
                                    : isUnmasked
                                      ? 'Mask email'
                                      : 'Unmask email'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {unmaskError && (
                            <div className="mt-1">
                              <span className="text-xs text-red-600">
                                {unmaskError}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{subscriber.firstName || '-'}</TableCell>
                        <TableCell>{subscriber.lastName || '-'}</TableCell>
                        <TableCell>
                          {getStatusBadge(subscriber.status)}
                        </TableCell>
                        <TableCell>
                          {formatDate(subscriber.subscribedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={subscribers.totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={subscribers.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
