'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi, subscriberApi, billingApi, } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from '@/components/ui/dialog';
import { Eye, EyeOff, Loader2, Download, RefreshCw, Trash2, Settings, } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from '@/components/ui/tooltip';
import { ListSelector } from '@/components/ListSelector';
export default function EspDetailPage() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { token } = useAuth();
    const [connection, setConnection] = useState(null);
    const [syncHistory, setSyncHistory] = useState([]);
    const [subscribers, setSubscribers] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Unmask state management
    const [unmaskedEmails, setUnmaskedEmails] = useState(new Map());
    const [unmaskingIds, setUnmaskingIds] = useState(new Set());
    const [unmaskErrors, setUnmaskErrors] = useState(new Map());
    // Export state management
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(null);
    // Sync state management
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);
    // Subscription status state
    const [hasActiveSubscription, setHasActiveSubscription] = useState(null);
    const [checkingSubscription, setCheckingSubscription] = useState(true);
    // OAuth success message state
    const [showOAuthSuccess, setShowOAuthSuccess] = useState(false);
    // Disconnect dialog state
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [disconnectError, setDisconnectError] = useState(null);
    // List management state
    const [showManageLists, setShowManageLists] = useState(false);
    const [availableLists, setAvailableLists] = useState([]);
    const [loadingLists, setLoadingLists] = useState(false);
    const [listsError, setListsError] = useState(null);
    const [isUpdatingLists, setIsUpdatingLists] = useState(false);
    const [listUpdateSuccess, setListUpdateSuccess] = useState(false);
    const [listUpdateError, setListUpdateError] = useState(null);
    // Pagination state from URL
    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    const itemsPerPage = parseInt(searchParams.get('limit') || '50', 10);
    useEffect(() => {
        async function fetchData() {
            if (!token || !id)
                return;
            setLoading(true);
            setError(null);
            try {
                // Fetch connection, sync history, and subscribers in parallel
                const [connectionData, syncData, subscribersData] = await Promise.all([
                    espConnectionApi.getConnection(id, token),
                    espConnectionApi.getSyncHistory(id, token, undefined, 1),
                    espConnectionApi.getSubscribers(id, token, undefined, currentPage, itemsPerPage),
                ]);
                setConnection(connectionData);
                setSyncHistory(syncData);
                setSubscribers(subscribersData);
            }
            catch (err) {
                console.error('Error fetching ESP detail data:', err);
                setError(err instanceof Error
                    ? err.message
                    : 'Failed to load ESP connection details');
            }
            finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [token, id, currentPage, itemsPerPage]);
    // Check subscription status on page load
    useEffect(() => {
        async function checkSubscription() {
            if (!token) {
                setCheckingSubscription(false);
                return;
            }
            setCheckingSubscription(true);
            try {
                const status = await billingApi.getBillingStatus(token);
                setHasActiveSubscription(status.hasActiveSubscription);
            }
            catch (err) {
                console.error('Error checking subscription status:', err);
                // Default to false if check fails (fail-safe)
                setHasActiveSubscription(false);
            }
            finally {
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
    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`/dashboard/esp/${id}?${params.toString()}`);
    };
    const formatDate = (dateString) => {
        if (!dateString)
            return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString();
    };
    const getStatusBadge = (status) => {
        const colors = {
            active: 'bg-green-500',
            unsubscribed: 'bg-gray-500',
            bounced: 'bg-red-500',
        };
        const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
        return (_jsx(Badge, { className: `${colors[status] || 'bg-gray-500'} text-white`, children: capitalizedStatus }));
    };
    const getSyncStatusBadge = (status) => {
        const colors = {
            idle: 'bg-gray-500',
            syncing: 'bg-blue-500',
            synced: 'bg-green-500',
            error: 'bg-red-500',
        };
        const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
        return (_jsx(Badge, { className: `${colors[status] || 'bg-gray-500'} text-white`, children: capitalizedStatus }));
    };
    const handleUnmaskToggle = async (subscriberId) => {
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
        if (!token)
            return;
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
        }
        catch (err) {
            console.error('Error unmasking email:', err);
            // Store error message for this subscriber
            const errorMessage = err instanceof Error ? err.message : 'Failed to unmask email';
            const newErrorMap = new Map(unmaskErrors);
            newErrorMap.set(subscriberId, errorMessage);
            setUnmaskErrors(newErrorMap);
        }
        finally {
            // Clear loading state
            setUnmaskingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(subscriberId);
                return newSet;
            });
        }
    };
    const handleExport = async (format) => {
        if (!token || !id)
            return;
        setIsExporting(true);
        setExportError(null);
        try {
            const { blob, filename } = await espConnectionApi.exportSubscribers(id, format, token);
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
        }
        catch (err) {
            console.error('Error exporting subscribers:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to export subscribers';
            setExportError(errorMessage);
            // Clear error after 5 seconds
            setTimeout(() => setExportError(null), 5000);
        }
        finally {
            setIsExporting(false);
        }
    };
    const handleSync = async () => {
        if (!token || !id)
            return;
        setIsSyncing(true);
        setSyncError(null);
        try {
            // Trigger sync - response includes updated connection
            const response = await espConnectionApi.triggerSync(id, token);
            // Update connection state with the response
            setConnection(response.connection);
            // Optionally refresh sync history after a short delay to see the new sync record
            setTimeout(async () => {
                try {
                    const syncData = await espConnectionApi.getSyncHistory(id, token, undefined, 1);
                    setSyncHistory(syncData);
                }
                catch (err) {
                    // Silently fail - sync history refresh is optional
                    console.error('Error refreshing sync history:', err);
                }
            }, 1000);
        }
        catch (err) {
            console.error('Error triggering sync:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to trigger sync';
            setSyncError(errorMessage);
            // Clear error after 5 seconds
            setTimeout(() => setSyncError(null), 5000);
        }
        finally {
            setIsSyncing(false);
        }
    };
    const handleDisconnect = async () => {
        if (!token || !id)
            return;
        setIsDisconnecting(true);
        setDisconnectError(null);
        try {
            await espConnectionApi.deleteConnection(id, token);
            // Redirect to dashboard after successful deletion
            router.push('/dashboard');
        }
        catch (err) {
            console.error('Error disconnecting ESP:', err);
            const errorMessage = err instanceof Error
                ? err.message
                : 'Failed to disconnect ESP connection';
            setDisconnectError(errorMessage);
        }
        finally {
            setIsDisconnecting(false);
        }
    };
    const handleManageLists = async () => {
        if (!token || !id)
            return;
        setShowManageLists(true);
        setLoadingLists(true);
        setListsError(null);
        try {
            const lists = await espConnectionApi.getLists(id, token);
            setAvailableLists(lists);
        }
        catch (err) {
            console.error('Error fetching available lists:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch available lists';
            setListsError(errorMessage);
        }
        finally {
            setLoadingLists(false);
        }
    };
    const handleUpdateSelectedLists = async (selectedListIds) => {
        if (!token || !id)
            return;
        setIsUpdatingLists(true);
        setListUpdateError(null);
        setListUpdateSuccess(false);
        try {
            const updatedConnection = await espConnectionApi.updateSelectedLists(id, { selectedListIds }, token);
            setConnection(updatedConnection);
            setListUpdateSuccess(true);
            // Hide success message after 3 seconds
            setTimeout(() => {
                setListUpdateSuccess(false);
                setShowManageLists(false);
            }, 3000);
        }
        catch (err) {
            console.error('Error updating selected lists:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update selected lists';
            setListUpdateError(errorMessage);
            // Clear error after 5 seconds
            setTimeout(() => setListUpdateError(null), 5000);
        }
        finally {
            setIsUpdatingLists(false);
        }
    };
    // Helper function to get list names for display
    const getListNames = () => {
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
        return (_jsx("div", { className: "p-8", children: _jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-8 bg-gray-200 rounded w-1/4" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [...Array(4)].map((_, i) => (_jsx("div", { className: "h-32 bg-gray-200 rounded" }, i))) }), _jsx("div", { className: "h-96 bg-gray-200 rounded" })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "p-8", children: _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsx("p", { className: "text-red-800", children: error }) }) }));
    }
    if (!connection || !subscribers) {
        return (_jsx("div", { className: "p-8", children: _jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: _jsx("p", { className: "text-yellow-800", children: "ESP connection not found" }) }) }));
    }
    // Calculate subscriber counts by status
    const activeCount = subscribers.data.filter((s) => s.status === 'active').length;
    const unsubscribedCount = subscribers.data.filter((s) => s.status === 'unsubscribed').length;
    const lastSync = syncHistory[0];
    return (_jsxs("div", { className: "p-8", children: [showOAuthSuccess && (_jsxs(Alert, { className: "mb-6 border-green-500 bg-green-50", children: [_jsx(AlertTitle, { className: "text-green-800", children: "Connection Successful!" }), _jsx(AlertDescription, { className: "text-green-700", children: "Your OAuth connection has been established successfully. Your subscribers are being synced." })] })), _jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold", children: connection.espType }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [(() => {
                                        const listNames = getListNames();
                                        if (listNames.length > 0) {
                                            return (_jsxs("p", { className: "text-gray-600", children: [listNames.length, " list", listNames.length !== 1 ? 's' : '', listNames.length <= 3 && (_jsxs("span", { className: "ml-1", children: [": ", listNames.join(', ')] }))] }));
                                        }
                                        return null;
                                    })(), _jsx(Badge, { variant: connection.authMethod === 'oauth' ? 'default' : 'secondary', children: connection.authMethod === 'oauth' ? 'OAuth' : 'API Key' })] })] }), _jsxs("div", { className: "flex flex-col items-end gap-2", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(TooltipProvider, { children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("span", { children: _jsx(Button, { onClick: handleSync, disabled: checkingSubscription ||
                                                                isSyncing ||
                                                                connection.syncStatus === 'syncing' ||
                                                                hasActiveSubscription === false, variant: "outline", children: checkingSubscription ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Checking..."] })) : isSyncing || connection.syncStatus === 'syncing' ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Syncing..."] })) : (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), "Sync"] })) }) }) }), hasActiveSubscription === false && (_jsx(TooltipContent, { children: _jsx("p", { children: "Active subscription required to sync" }) }))] }) }), _jsx(TooltipProvider, { children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("span", { children: _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { disabled: checkingSubscription ||
                                                                            isExporting ||
                                                                            hasActiveSubscription === false, children: checkingSubscription ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Checking..."] })) : isExporting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Exporting..."] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), "Export"] })) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuItem, { onClick: () => handleExport('csv'), children: "Export as CSV" }), _jsx(DropdownMenuItem, { onClick: () => handleExport('json'), children: "Export as JSON" }), _jsx(DropdownMenuItem, { onClick: () => handleExport('xlsx'), children: "Export as Excel" })] })] }) }) }), hasActiveSubscription === false && (_jsx(TooltipContent, { children: _jsx("p", { children: "Active subscription required to export" }) }))] }) })] }), syncError && _jsx("p", { className: "text-sm text-red-600", children: syncError }), exportError && _jsx("p", { className: "text-sm text-red-600", children: exportError })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8", children: [_jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium text-gray-600", children: "List Size" }) }), _jsx(CardContent, { children: _jsx("p", { className: "text-3xl font-bold", children: subscribers.total }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium text-gray-600", children: "Last Sync" }) }), _jsx(CardContent, { children: lastSync ? (_jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold", children: formatDate(lastSync.completedAt) }), _jsx(Badge, { className: `mt-2 ${lastSync.status === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`, children: lastSync.status.charAt(0).toUpperCase() +
                                                lastSync.status.slice(1) })] })) : (_jsx("p", { className: "text-lg font-semibold text-gray-400", children: "Never" })) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium text-gray-600", children: "Connection Status" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "mt-2", children: getSyncStatusBadge(connection.syncStatus) }), _jsx("p", { className: "text-sm text-gray-600 mt-2", children: connection.status.charAt(0).toUpperCase() +
                                            connection.status.slice(1) })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsx(CardTitle, { className: "text-sm font-medium text-gray-600", children: "Subscriber Breakdown" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-sm", children: [_jsx("span", { className: "font-semibold text-green-600", children: activeCount }), ' ', "Active"] }), _jsxs("p", { className: "text-sm", children: [_jsx("span", { className: "font-semibold text-gray-600", children: unsubscribedCount }), ' ', "Unsubscribed"] })] }) })] })] }), _jsxs(Card, { className: "mb-8", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(CardTitle, { children: "Selected Lists" }), _jsx(Button, { variant: "outline", size: "sm", onClick: handleManageLists, disabled: loadingLists, children: loadingLists ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Loading..."] })) : (_jsxs(_Fragment, { children: [_jsx(Settings, { className: "h-4 w-4 mr-2" }), "Manage Lists"] })) })] }) }), _jsx(CardContent, { children: (() => {
                            const listNames = getListNames();
                            if (listNames.length > 0) {
                                return (_jsx("div", { className: "flex flex-wrap gap-2", children: listNames.map((listName, index) => (_jsx(Badge, { variant: "outline", className: "text-sm", children: listName }, index))) }));
                            }
                            return (_jsx("p", { className: "text-sm text-gray-500", children: "No lists selected. Click \"Manage Lists\" to select lists to sync." }));
                        })() })] }), _jsx(Dialog, { open: showManageLists, onOpenChange: setShowManageLists, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[80vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Manage Lists" }), _jsx(DialogDescription, { children: "Select which lists to sync from this ESP connection. Changes will be saved immediately." })] }), listUpdateSuccess && (_jsxs(Alert, { className: "border-green-500 bg-green-50", children: [_jsx(AlertTitle, { className: "text-green-800", children: "Success!" }), _jsx(AlertDescription, { className: "text-green-700", children: "Selected lists have been updated successfully." })] })), listUpdateError && (_jsxs(Alert, { variant: "destructive", children: [_jsx(AlertTitle, { children: "Error" }), _jsx(AlertDescription, { children: listUpdateError })] })), _jsx(ListSelector, { lists: availableLists, selectedListIds: connection?.publicationIds || connection?.publicationId
                                ? connection.publicationIds || [connection.publicationId]
                                : [], onSelectionChange: handleUpdateSelectedLists, loading: loadingLists, error: listsError }), _jsx(DialogFooter, { children: _jsx(Button, { variant: "outline", onClick: () => {
                                    setShowManageLists(false);
                                    setListsError(null);
                                    setListUpdateError(null);
                                    setListUpdateSuccess(false);
                                }, disabled: isUpdatingLists, children: "Close" }) })] }) }), connection.authMethod === 'oauth' && (_jsxs(Card, { className: "mb-8", children: [_jsx(CardHeader, { children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx(CardTitle, { children: "OAuth Connection Details" }), _jsxs(Button, { variant: "destructive", size: "sm", onClick: () => setShowDisconnectDialog(true), children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), "Disconnect"] })] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 mb-1", children: "Token Expires At" }), _jsx("p", { className: "text-base", children: connection.tokenExpiresAt
                                                ? formatDate(connection.tokenExpiresAt)
                                                : 'Not available' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 mb-1", children: "Last Refreshed" }), _jsx("p", { className: "text-base", children: connection.lastValidatedAt
                                                ? formatDate(connection.lastValidatedAt)
                                                : 'Never' })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("p", { className: "text-sm font-medium text-gray-600 mb-2", children: "Connected Lists" }), (() => {
                                            const listNames = getListNames();
                                            if (listNames.length > 0) {
                                                return (_jsx("div", { className: "flex flex-wrap gap-2", children: listNames.map((listName, index) => (_jsx(Badge, { variant: "outline", children: listName }, index))) }));
                                            }
                                            return _jsx("p", { className: "text-sm text-gray-500", children: "No lists" });
                                        })()] })] }) })] })), _jsx(Dialog, { open: showDisconnectDialog, onOpenChange: setShowDisconnectDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Disconnect ESP Connection" }), _jsx(DialogDescription, { children: "Are you sure you want to disconnect this ESP connection? This action will permanently delete the connection and all associated subscribers and sync history. This action cannot be undone." })] }), disconnectError && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: disconnectError }) })), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => {
                                        setShowDisconnectDialog(false);
                                        setDisconnectError(null);
                                    }, disabled: isDisconnecting, children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: handleDisconnect, disabled: isDisconnecting, children: isDisconnecting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Disconnecting..."] })) : (_jsxs(_Fragment, { children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), "Disconnect"] })) })] })] }) }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Subscribers" }) }), _jsxs(CardContent, { children: [_jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Email" }), _jsx(TableHead, { children: "First Name" }), _jsx(TableHead, { children: "Last Name" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Subscribed At" })] }) }), _jsx(TableBody, { children: subscribers.data.length === 0 ? (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center text-gray-500", children: "No subscribers found" }) })) : (subscribers.data.map((subscriber) => {
                                                const isUnmasked = unmaskedEmails.has(subscriber.id);
                                                const isUnmasking = unmaskingIds.has(subscriber.id);
                                                const unmaskError = unmaskErrors.get(subscriber.id);
                                                return (_jsxs(TableRow, { children: [_jsxs(TableCell, { className: "font-mono text-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { children: isUnmasked
                                                                                ? unmaskedEmails.get(subscriber.id)
                                                                                : subscriber.maskedEmail }), _jsx(TooltipProvider, { children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { variant: "ghost", size: "sm", className: "h-6 w-6 p-0", onClick: () => handleUnmaskToggle(subscriber.id), disabled: isUnmasking, children: isUnmasking ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : isUnmasked ? (_jsx(EyeOff, { className: "h-4 w-4" })) : (_jsx(Eye, { className: "h-4 w-4" })) }) }), _jsx(TooltipContent, { children: isUnmasking
                                                                                            ? 'Loading...'
                                                                                            : isUnmasked
                                                                                                ? 'Mask email'
                                                                                                : 'Unmask email' })] }) })] }), unmaskError && (_jsx("div", { className: "mt-1", children: _jsx("span", { className: "text-xs text-red-600", children: unmaskError }) }))] }), _jsx(TableCell, { children: subscriber.firstName || '-' }), _jsx(TableCell, { children: subscriber.lastName || '-' }), _jsx(TableCell, { children: getStatusBadge(subscriber.status) }), _jsx(TableCell, { children: formatDate(subscriber.subscribedAt) })] }, subscriber.id));
                                            })) })] }) }), _jsx(Pagination, { currentPage: currentPage, totalPages: subscribers.totalPages, onPageChange: handlePageChange, itemsPerPage: itemsPerPage, totalItems: subscribers.total })] })] })] }));
}
