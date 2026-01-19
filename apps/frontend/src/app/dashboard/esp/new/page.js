'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { espConfigs, supportsOAuth, getEspConfig, } from '@/lib/esp-config';
import { ListSelector } from '@/components/ListSelector';
export default function NewEspConnectionPage() {
    const router = useRouter();
    const { token } = useAuth();
    const [selectedEspType, setSelectedEspType] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [publicationId, setPublicationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [lists, setLists] = useState([]);
    const [selectedListIds, setSelectedListIds] = useState([]);
    const [fetchingLists, setFetchingLists] = useState(false);
    const [listsFetched, setListsFetched] = useState(false);
    const [tempConnectionId, setTempConnectionId] = useState(null);
    // Check if selected ESP type supports OAuth
    const hasOAuth = selectedEspType ? supportsOAuth(selectedEspType) : false;
    const handleEspTypeSelect = (espType) => {
        setSelectedEspType(espType);
        setError(null);
        setValidationErrors({});
    };
    const handleOAuthConnect = async () => {
        if (!token || !selectedEspType) {
            return;
        }
        try {
            await espConnectionApi.initiateOAuth(selectedEspType, token, () => {
                router.push('/login');
            });
            // initiateOAuth will redirect the browser, so we don't need to do anything else
        }
        catch (err) {
            console.error('Failed to initiate OAuth:', err);
            setError(err instanceof Error
                ? err.message
                : 'Failed to initiate OAuth connection');
        }
    };
    const handleBack = () => {
        if (listsFetched) {
            // Go back from list selection to API key form
            setListsFetched(false);
            setLists([]);
            setSelectedListIds([]);
            setTempConnectionId(null);
            setError(null);
            // Delete temporary connection if it exists
            if (tempConnectionId && token) {
                espConnectionApi
                    .deleteConnection(tempConnectionId, token, () => {
                    router.push('/login');
                })
                    .catch(() => {
                    // Ignore errors when deleting temporary connection
                });
            }
        }
        else {
            // Go back from form to ESP selection
            setSelectedEspType(null);
            setApiKey('');
            setPublicationId('');
            setError(null);
            setValidationErrors({});
        }
    };
    const validateForm = () => {
        const errors = {};
        if (!apiKey.trim()) {
            errors.apiKey = 'API Key is required';
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleValidateAndFetchLists = async () => {
        if (!apiKey.trim()) {
            setError('Please enter your API key');
            return;
        }
        setFetchingLists(true);
        setError(null);
        setValidationErrors({});
        try {
            if (!token || !selectedEspType) {
                throw new Error('Authentication required. Please log in again.');
            }
            // Some ESPs require publicationId for validation
            // If not provided, we'll try with a placeholder and handle the error
            const tempPublicationId = publicationId.trim() || 'placeholder';
            // Create connection (this validates API key and fetches lists)
            const connection = await espConnectionApi.createConnection({
                espType: selectedEspType,
                apiKey: apiKey.trim(),
                publicationId: tempPublicationId,
            }, token, () => {
                router.push('/login');
            });
            // Fetch available lists from the created connection
            const availableLists = await espConnectionApi.getLists(connection.id, token, () => {
                router.push('/login');
            });
            if (availableLists.length === 0) {
                setError('No lists found. Please check your API key and try again.');
                // Delete the temporary connection if no lists found
                try {
                    await espConnectionApi.deleteConnection(connection.id, token, () => {
                        router.push('/login');
                    });
                }
                catch {
                    // Ignore errors when deleting temporary connection
                }
                setFetchingLists(false);
                return;
            }
            // Set lists and default to all selected
            setLists(availableLists);
            setSelectedListIds(availableLists.map((list) => list.id));
            setListsFetched(true);
            setTempConnectionId(connection.id);
        }
        catch (err) {
            const errorMessage = err.message || 'Failed to validate API key. Please try again.';
            // Check if error is about missing publicationId
            if (errorMessage.toLowerCase().includes('publication') ||
                errorMessage.toLowerCase().includes('publication id')) {
                setError('This ESP requires a Publication ID. Please enter it above and try again.');
            }
            else {
                setError(errorMessage);
            }
        }
        finally {
            setFetchingLists(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setValidationErrors({});
        if (!selectedEspType || !token) {
            return;
        }
        if (!listsFetched) {
            // If lists haven't been fetched yet, validate and fetch them first
            if (!validateForm()) {
                return;
            }
            await handleValidateAndFetchLists();
            return;
        }
        if (selectedListIds.length === 0) {
            setError('Please select at least one list to sync');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (!token || !tempConnectionId) {
                throw new Error('Connection not found. Please start over.');
            }
            // Update selected lists for the connection
            await espConnectionApi.updateSelectedLists(tempConnectionId, { selectedListIds }, token, () => {
                router.push('/login');
            });
            // Automatically trigger sync
            try {
                await espConnectionApi.triggerSync(tempConnectionId, token, () => {
                    router.push('/login');
                });
            }
            catch (syncError) {
                // If sync trigger fails, still redirect to detail page
                // The user can manually trigger sync from there
                console.error('Failed to trigger sync:', syncError);
            }
            // Redirect to ESP detail page
            router.push(`/dashboard/esp/${tempConnectionId}`);
        }
        catch (err) {
            setError(err.message || 'Failed to create ESP connection. Please try again.');
            setLoading(false);
        }
    };
    // ESP Type Selection View
    if (!selectedEspType) {
        return (_jsxs("div", { className: "container mx-auto px-4 py-8 max-w-4xl", children: [_jsxs("div", { className: "mb-6", children: [_jsx(Link, { href: "/dashboard", children: _jsxs(Button, { variant: "ghost", size: "sm", className: "mb-4", children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), "Back to Dashboard"] }) }), _jsx("h1", { className: "text-3xl font-semibold mb-2", children: "Connect New ESP" }), _jsx("p", { className: "text-muted-foreground", children: "Select your email service provider to get started" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: espConfigs.map((esp) => (_jsxs(Card, { className: "cursor-pointer hover:border-primary transition-colors", onClick: () => handleEspTypeSelect(esp.id), children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-xl", children: esp.name }), _jsx(CardDescription, { children: esp.description })] }), _jsx(CardContent, { children: _jsxs(Button, { variant: "outline", className: "w-full", onClick: (e) => {
                                        e.stopPropagation();
                                        handleEspTypeSelect(esp.id);
                                    }, children: ["Select ", esp.name] }) })] }, esp.id))) })] }));
    }
    // Form View
    return (_jsxs("div", { className: "container mx-auto px-4 py-8 max-w-2xl", children: [_jsxs("div", { className: "mb-6", children: [_jsxs(Button, { variant: "ghost", size: "sm", className: "mb-4", onClick: handleBack, disabled: loading, children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), "Back to ESP Selection"] }), _jsxs("h1", { className: "text-3xl font-semibold mb-2", children: ["Connect ", getEspConfig(selectedEspType)?.name || selectedEspType] }), _jsx("p", { className: "text-muted-foreground", children: "Enter your API credentials to connect your account" })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Connection Details" }), _jsx(CardDescription, { children: hasOAuth
                                    ? 'Connect your account securely using OAuth'
                                    : 'Please provide your API key and publication ID' })] }), _jsx(CardContent, { children: hasOAuth ? (_jsx("div", { className: "space-y-4", children: _jsxs("div", { className: "p-4 rounded-md bg-primary/10 border border-primary/20", children: [_jsx("p", { className: "text-sm text-primary font-medium mb-2", children: "Connect with OAuth" }), _jsxs("p", { className: "text-sm text-muted-foreground mb-4", children: ["Connect your", ' ', getEspConfig(selectedEspType)?.name || selectedEspType, ' ', "account securely using OAuth. No API keys needed!"] }), error && (_jsx("div", { className: "p-3 rounded-md bg-destructive/10 border border-destructive/20 mb-4", children: _jsx("p", { className: "text-sm text-destructive", children: error }) })), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleBack, disabled: loading, className: "flex-1", children: "Cancel" }), _jsx(Button, { onClick: handleOAuthConnect, disabled: loading, className: "flex-1", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Connecting..."] })) : ('Connect with OAuth') })] })] }) })) : (_jsx("form", { onSubmit: handleSubmit, className: "space-y-4", children: !listsFetched ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("label", { htmlFor: "apiKey", className: "text-sm font-medium", children: ["API Key ", _jsx("span", { className: "text-destructive", children: "*" })] }), _jsx(Input, { id: "apiKey", type: "password", placeholder: "Enter your API key", value: apiKey, onChange: (e) => setApiKey(e.target.value), disabled: loading || fetchingLists, className: validationErrors.apiKey ? 'border-destructive' : '' }), validationErrors.apiKey && (_jsx("p", { className: "text-sm text-destructive", children: validationErrors.apiKey }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "publicationId", className: "text-sm font-medium", children: "Publication ID (optional)" }), _jsx(Input, { id: "publicationId", type: "text", placeholder: "Enter your publication ID (optional)", value: publicationId, onChange: (e) => setPublicationId(e.target.value), disabled: loading || fetchingLists, className: validationErrors.publicationId
                                                    ? 'border-destructive'
                                                    : '' }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Some ESPs require a publication ID for validation. If not provided, we'll try to fetch it automatically." }), validationErrors.publicationId && (_jsx("p", { className: "text-sm text-destructive", children: validationErrors.publicationId }))] }), error && (_jsx("div", { className: "p-3 rounded-md bg-destructive/10 border border-destructive/20", children: _jsx("p", { className: "text-sm text-destructive", children: error }) })), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleBack, disabled: loading || fetchingLists, className: "flex-1", children: "Cancel" }), _jsx(Button, { type: "submit", disabled: loading || fetchingLists || !apiKey.trim(), className: "flex-1", children: fetchingLists ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Validating..."] })) : ('Continue to select lists') })] })] })) : (_jsx(_Fragment, { children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { children: _jsx("p", { className: "text-sm text-muted-foreground mb-2", children: "API key validated successfully. Select which lists to sync:" }) }), _jsx(ListSelector, { lists: lists, selectedListIds: selectedListIds, onSelectionChange: setSelectedListIds, loading: false, error: null }), error && (_jsx("div", { className: "p-3 rounded-md bg-destructive/10 border border-destructive/20", children: _jsx("p", { className: "text-sm text-destructive", children: error }) })), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleBack, disabled: loading, className: "flex-1", children: "Back" }), _jsx(Button, { type: "submit", disabled: loading || selectedListIds.length === 0, className: "flex-1", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }), "Connecting..."] })) : ('Connect & Sync') })] })] }) })) })) })] })] }));
}
