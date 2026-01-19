'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';
export default function AccountDeletionPage() {
    const router = useRouter();
    const { user, token } = useAuth();
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(null);
    useEffect(() => {
        // Redirect if not authenticated or if deletion not requested
        if (!user || !user.deleteRequestedAt) {
            router.push('/dashboard');
            return;
        }
        // Fetch ESP connections for export
        const fetchConnections = async () => {
            if (!token)
                return;
            try {
                const data = await espConnectionApi.getUserConnections(token);
                setConnections(data);
            }
            catch (err) {
                console.error('Error fetching connections:', err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchConnections();
    }, [user, token, router]);
    const handleExport = async (connectionId, format) => {
        if (!token)
            return;
        setExporting(`${connectionId}-${format}`);
        try {
            const { blob, filename } = await espConnectionApi.exportSubscribers(connectionId, format, token);
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
            alert('Failed to export subscribers. Please try again.');
        }
        finally {
            setExporting(null);
        }
    };
    if (!user || !user.deleteRequestedAt) {
        return null;
    }
    const deletionDate = typeof user.deleteRequestedAt === 'string'
        ? new Date(user.deleteRequestedAt)
        : user.deleteRequestedAt;
    const deletionDeadline = new Date(deletionDate);
    deletionDeadline.setDate(deletionDeadline.getDate() + 30);
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-6 py-12", children: _jsx("div", { className: "w-full max-w-2xl", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-2xl", children: "Account Deletion in Progress" }), _jsxs(CardDescription, { children: ["Your account deletion was requested on", ' ', deletionDate.toLocaleDateString()] })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsx(Alert, { variant: "destructive", children: _jsxs("div", { className: "space-y-2", children: [_jsxs("p", { className: "font-semibold", children: ["Your account will be permanently deleted on", ' ', deletionDeadline.toLocaleDateString(), "."] }), _jsxs("p", { children: ["You have", ' ', Math.ceil((deletionDeadline.getTime() - Date.now()) /
                                                    (1000 * 60 * 60 * 24)), ' ', "days remaining to export your data."] })] }) }), _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "font-semibold text-lg", children: "Export Your Data" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "During the 30-day grace period, you can export your subscriber data. After the deadline, all data will be permanently deleted." }), loading ? (_jsx("div", { className: "text-sm text-muted-foreground", children: "Loading connections..." })) : connections.length === 0 ? (_jsx("div", { className: "text-sm text-muted-foreground", children: "No ESP connections found." })) : (_jsx("div", { className: "space-y-4", children: connections.map((connection) => (_jsxs("div", { className: "border rounded-lg p-4 space-y-3", children: [_jsxs("div", { children: [_jsxs("h4", { className: "font-medium", children: [connection.espType.toUpperCase(), " Connection"] }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Export subscribers from this connection" })] }), _jsxs("div", { className: "flex gap-2 flex-wrap", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => handleExport(connection.id, 'csv'), disabled: exporting === `${connection.id}-csv`, children: exporting === `${connection.id}-csv`
                                                                ? 'Exporting...'
                                                                : 'Export CSV' }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => handleExport(connection.id, 'json'), disabled: exporting === `${connection.id}-json`, children: exporting === `${connection.id}-json`
                                                                ? 'Exporting...'
                                                                : 'Export JSON' }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => handleExport(connection.id, 'xlsx'), disabled: exporting === `${connection.id}-xlsx`, children: exporting === `${connection.id}-xlsx`
                                                                ? 'Exporting...'
                                                                : 'Export Excel' })] })] }, connection.id))) }))] }), _jsx("div", { className: "pt-4 border-t", children: _jsx("p", { className: "text-sm text-muted-foreground", children: "If you need to cancel the deletion request, please contact support." }) })] })] }) }) }));
}
