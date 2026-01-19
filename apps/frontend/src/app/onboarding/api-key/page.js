'use client';
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { espConnectionApi } from '@/lib/api';
import { supportsOAuth, getEspConfig } from '@/lib/esp-config';
import { ListSelector } from '@/components/ListSelector';
function ApiKeyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [publicationId, setPublicationId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lists, setLists] = useState([]);
    const [selectedListIds, setSelectedListIds] = useState([]);
    const [fetchingLists, setFetchingLists] = useState(false);
    const [listsFetched, setListsFetched] = useState(false);
    const provider = (searchParams.get('provider') || '');
    // Check if provider supports OAuth
    const hasOAuth = supportsOAuth(provider);
    useEffect(() => {
        const validEspTypes = [
            'beehiiv',
            'kit',
            'mailchimp',
            'campaign_monitor',
            'email_octopus',
            'omeda',
            'ghost',
            'sparkpost',
            'active_campaign',
            'customer_io',
            'sailthru',
            'mailerlite',
            'postup',
            'constant_contact',
            'iterable',
            'sendgrid',
            'brevo',
        ];
        if (!provider || !validEspTypes.includes(provider)) {
            router.push('/onboarding');
        }
    }, [provider, router]);
    const handleOAuthConnect = async () => {
        if (!token) {
            router.push('/login');
            return;
        }
        try {
            await espConnectionApi.initiateOAuth(provider, token, () => {
                router.push('/login');
            }, true // Pass onboarding=true for onboarding flow
            );
            // initiateOAuth will redirect the browser, so we don't need to do anything else
        }
        catch (err) {
            console.error('Failed to initiate OAuth:', err);
            setError(err instanceof Error
                ? err.message
                : 'Failed to initiate OAuth connection');
        }
    };
    const handleValidateAndFetchLists = async () => {
        if (!apiKey.trim()) {
            setError('Please enter your API key');
            return;
        }
        setFetchingLists(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('Authentication required. Please log in again.');
            }
            // Some ESPs require publicationId for validation
            // If not provided, we'll try with an empty string and handle the error
            const tempPublicationId = publicationId.trim() || '';
            // Create connection (this validates API key and fetches lists)
            const connection = await espConnectionApi.createConnection({
                espType: provider,
                apiKey,
                publicationId: tempPublicationId || 'placeholder',
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
            // Store connection ID for later use
            sessionStorage.setItem('tempConnectionId', connection.id);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to validate API key';
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
        if (!listsFetched) {
            // If lists haven't been fetched yet, validate and fetch them first
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
            if (!token) {
                throw new Error('Authentication required. Please log in again.');
            }
            // Get the temporary connection ID from sessionStorage
            const tempConnectionId = sessionStorage.getItem('tempConnectionId');
            if (!tempConnectionId) {
                throw new Error('Connection not found. Please start over.');
            }
            // Update selected lists for the connection
            await espConnectionApi.updateSelectedLists(tempConnectionId, { selectedListIds }, token, () => {
                router.push('/login');
            });
            // Clear temporary connection ID
            sessionStorage.removeItem('tempConnectionId');
            // Redirect to Stripe onboarding step
            // Sync will be triggered after payment is completed in /onboarding/success
            router.push('/onboarding/stripe');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const providerConfig = getEspConfig(provider);
    if (!provider || !providerConfig) {
        return null; // Will redirect in useEffect
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-6 py-12", children: _jsx("div", { className: "w-full max-w-md", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-2xl", children: ["Connect ", providerConfig.name] }), _jsxs(CardDescription, { children: ["Enter your ", providerConfig.name, " API key to sync your subscribers"] })] }), _jsx(CardContent, { children: hasOAuth ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "p-4 rounded-md bg-primary/10 border border-primary/20", children: [_jsx("p", { className: "text-sm text-primary font-medium mb-2", children: "Connect with OAuth" }), _jsxs("p", { className: "text-sm text-muted-foreground mb-4", children: ["Connect your ", providerConfig.name, " account securely using OAuth. No API keys needed!"] }), _jsx(Button, { onClick: handleOAuthConnect, className: "w-full", disabled: loading, children: loading ? 'Connecting...' : 'Connect with OAuth' })] }), error && (_jsx("div", { className: "p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm", children: error }))] })) : (_jsx("form", { onSubmit: handleSubmit, className: "space-y-4", children: !listsFetched ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "apiKey", className: "block text-sm font-medium mb-2", children: "API Key" }), _jsx(Input, { id: "apiKey", type: "password", placeholder: "Enter your API key", value: apiKey, onChange: (e) => setApiKey(e.target.value), required: true, disabled: loading || fetchingLists, autoFocus: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "publicationId", className: "block text-sm font-medium mb-2", children: "Publication ID (optional)" }), _jsx(Input, { id: "publicationId", type: "text", placeholder: "Enter your publication ID (optional)", value: publicationId, onChange: (e) => setPublicationId(e.target.value), disabled: loading || fetchingLists }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Some ESPs require a publication ID for validation. If not provided, we'll try to fetch it automatically." })] }), error && (_jsx("div", { className: "p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm", children: error })), _jsx(Button, { type: "submit", className: "w-full", disabled: loading || fetchingLists || !apiKey.trim(), children: fetchingLists
                                            ? 'Validating API key...'
                                            : 'Continue to select lists' })] })) : (_jsx(_Fragment, { children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { children: _jsx("p", { className: "text-sm text-muted-foreground mb-2", children: "API key validated successfully. Select which lists to sync:" }) }), _jsx(ListSelector, { lists: lists, selectedListIds: selectedListIds, onSelectionChange: setSelectedListIds, loading: false, error: null }), error && (_jsx("div", { className: "p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm", children: error })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => {
                                                        setListsFetched(false);
                                                        setLists([]);
                                                        setSelectedListIds([]);
                                                        sessionStorage.removeItem('tempConnectionId');
                                                    }, disabled: loading, children: "Back" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: loading || selectedListIds.length === 0, children: loading
                                                        ? 'Creating connection...'
                                                        : 'Sync subscribers to vault' })] })] }) })) })) })] }) }) }));
}
export default function ApiKeyPage() {
    return (_jsx(Suspense, { fallback: _jsx("div", { className: "min-h-screen flex items-center justify-center px-6 py-12", children: _jsx("div", { className: "w-full max-w-md", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-6 bg-secondary rounded w-3/4 mb-2" }), _jsx("div", { className: "h-4 bg-secondary rounded w-1/2" })] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-10 bg-secondary rounded" }), _jsx("div", { className: "h-10 bg-secondary rounded" })] }) })] }) }) }), children: _jsx(ApiKeyForm, {}) }));
}
