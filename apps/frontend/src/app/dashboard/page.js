'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, espConnectionApi, } from '@/lib/api';
const providerNames = {
    kit: 'Kit',
    beehiiv: 'beehiiv',
    mailchimp: 'Mailchimp',
};
function WelcomeOverlay({ onComplete }) {
    useEffect(() => {
        // Auto-dismiss after 2 seconds
        const timer = setTimeout(() => {
            onComplete();
        }, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);
    return (_jsx("div", { className: "fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center space-y-4", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" }), _jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold mb-2", children: "Welcome to SubscriberNest!" }), _jsx("p", { className: "text-muted-foreground", children: "Setting up your dashboard..." })] })] }) }));
}
function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [syncHistory, setSyncHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWelcome, setShowWelcome] = useState(false);
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
        const fetchDashboardData = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                // Fetch stats and connections in parallel
                const [statsData, connections] = await Promise.all([
                    dashboardApi.getStats(token, () => router.push('/login')),
                    espConnectionApi.getUserConnections(token, () => router.push('/login')),
                ]);
                setStats(statsData);
                // Fetch sync history for all connections
                if (connections.length > 0) {
                    const syncHistoryPromises = connections.map((conn) => espConnectionApi
                        .getSyncHistory(conn.id, token, () => router.push('/login'), 50)
                        .then((history) => history.map((h) => ({
                        ...h,
                        espName: `${providerNames[conn.espType] || conn.espType} (${conn.publicationId})`,
                    })))
                        .catch(() => []) // Silently handle errors for individual connections
                    );
                    const allSyncHistory = await Promise.all(syncHistoryPromises);
                    // Flatten and sort by startedAt DESC
                    const mergedHistory = allSyncHistory
                        .flat()
                        .sort((a, b) => new Date(b.startedAt).getTime() -
                        new Date(a.startedAt).getTime())
                        .slice(0, 50); // Keep only top 50
                    setSyncHistory(mergedHistory);
                }
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            }
            finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [token, router]);
    const formatDateTime = (dateString) => {
        if (!dateString)
            return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const formatLastSync = (dateString) => {
        if (!dateString)
            return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24)
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7)
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return formatDateTime(dateString);
    };
    // Show welcome overlay when coming from onboarding
    if (showWelcome) {
        return (_jsxs(_Fragment, { children: [_jsx(WelcomeOverlay, { onComplete: () => setShowWelcome(false) }), _jsx(DashboardLoadingSkeleton, {})] }));
    }
    if (loading) {
        return _jsx(DashboardLoadingSkeleton, {});
    }
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "Dashboard Overview" }), _jsx("p", { className: "text-muted-foreground", children: "Monitor your ESP connections and sync activity" })] }), error && (_jsx(Card, { className: "mb-6 border-destructive", children: _jsx(CardContent, { className: "pt-6", children: _jsx("p", { className: "text-destructive", children: error }) }) })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-8", children: [_jsx(Card, { children: _jsxs(CardHeader, { children: [_jsx(CardDescription, { children: "Total ESPs" }), _jsx(CardTitle, { className: "text-4xl", children: stats?.totalEspConnections || 0 })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { children: [_jsx(CardDescription, { children: "Total Subscribers" }), _jsx(CardTitle, { className: "text-4xl", children: stats?.totalSubscribers || 0 })] }) }), _jsx(Card, { children: _jsxs(CardHeader, { children: [_jsx(CardDescription, { children: "Last Sync" }), _jsx(CardTitle, { className: "text-2xl", children: formatLastSync(stats?.lastSyncTime || null) })] }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Recent Sync History" }), _jsx(CardDescription, { children: "Most recent sync operations across all ESP connections" })] }), _jsx(CardContent, { children: syncHistory.length === 0 ? (_jsx("p", { className: "text-muted-foreground text-center py-8", children: "No sync history yet. Sync your ESP connections to see activity here." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "ESP Name" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Started At" }), _jsx(TableHead, { children: "Completed At" }), _jsx(TableHead, { children: "Error" })] }) }), _jsx(TableBody, { children: syncHistory.map((history) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: history.espName }), _jsx(TableCell, { children: _jsx(Badge, { variant: history.status === 'success'
                                                            ? 'default'
                                                            : 'destructive', className: history.status === 'success'
                                                            ? 'bg-green-500 hover:bg-green-600'
                                                            : '', children: history.status.charAt(0).toUpperCase() +
                                                            history.status.slice(1) }) }), _jsx(TableCell, { children: formatDateTime(history.startedAt) }), _jsx(TableCell, { children: formatDateTime(history.completedAt) }), _jsx(TableCell, { children: history.status === 'failed' && history.errorMessage ? (_jsx("span", { className: "text-sm text-destructive max-w-xs truncate block", title: history.errorMessage, children: history.errorMessage })) : ('-') })] }, history.id))) })] }) })) })] })] }));
}
function DashboardLoadingSkeleton() {
    return (_jsx("div", { className: "p-6", children: _jsxs("div", { className: "animate-pulse space-y-6", children: [_jsx("div", { className: "h-8 bg-secondary rounded w-1/3" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx("div", { className: "h-32 bg-secondary rounded" }), _jsx("div", { className: "h-32 bg-secondary rounded" }), _jsx("div", { className: "h-32 bg-secondary rounded" })] }), _jsx("div", { className: "h-64 bg-secondary rounded" })] }) }));
}
export default function DashboardPage() {
    return (_jsx(Suspense, { fallback: _jsx(DashboardLoadingSkeleton, {}), children: _jsx(DashboardContent, {}) }));
}
