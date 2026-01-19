/**
 * API client for SubscriberNest backend
 *
 * Provides typed functions for all backend endpoints with automatic
 * authentication token handling and 401 error management.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
/**
 * Base API request function with automatic auth token handling and 401 error management
 */
async function apiRequest(endpoint, options = {}, token = null, onUnauthorized) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    // Add auth token if provided
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: headers,
    });
    // Handle 401 Unauthorized - clear auth and redirect to login
    if (response.status === 401) {
        if (onUnauthorized) {
            onUnauthorized();
        }
        // Redirect to login if we're not already there
        if (typeof window !== 'undefined' &&
            !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
        throw new Error('Unauthorized');
    }
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.statusText}`);
    }
    return response.json();
}
/**
 * Auth API functions
 */
export const authApi = {
    /**
     * Send verification code to email
     */
    sendCode: async (data) => {
        return apiRequest('/auth/send-code', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    /**
     * Verify code and create session
     */
    verifyCode: async (data) => {
        return apiRequest('/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    /**
     * Get current authenticated user
     */
    getCurrentUser: async (token, onUnauthorized) => {
        return apiRequest('/auth/me', {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Logout and invalidate session
     */
    logout: async (token, onUnauthorized) => {
        return apiRequest('/auth/logout', {
            method: 'POST',
        }, token, onUnauthorized);
    },
    /**
     * Mark user as onboarded
     */
    completeOnboarding: async (token, onUnauthorized) => {
        return apiRequest('/auth/complete-onboarding', {
            method: 'POST',
        }, token, onUnauthorized);
    },
};
/**
 * ESP Connection API functions
 */
export const espConnectionApi = {
    /**
     * Create a new ESP connection
     */
    createConnection: async (data, token, onUnauthorized) => {
        return apiRequest('/esp-connections', {
            method: 'POST',
            body: JSON.stringify(data),
        }, token, onUnauthorized);
    },
    /**
     * Get user's ESP connections
     */
    getUserConnections: async (token, onUnauthorized) => {
        return apiRequest('/esp-connections', {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Trigger manual sync for ESP connection
     */
    triggerSync: async (connectionId, token, onUnauthorized) => {
        return apiRequest(`/esp-connections/${connectionId}/sync`, {
            method: 'POST',
        }, token, onUnauthorized);
    },
    /**
     * Get sync history for ESP connection
     */
    getSyncHistory: async (connectionId, token, onUnauthorized, limit) => {
        const url = `/esp-connections/${connectionId}/sync-history${limit ? `?limit=${limit}` : ''}`;
        return apiRequest(url, {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Get single ESP connection by ID
     */
    getConnection: async (connectionId, token, onUnauthorized) => {
        return apiRequest(`/esp-connections/${connectionId}`, {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Get subscriber count from ESP API for a connection
     * This is a lightweight call that returns just the count
     */
    getSubscriberCount: async (connectionId, token, onUnauthorized) => {
        return apiRequest(`/esp-connections/${connectionId}/subscriber-count`, {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Get paginated subscribers for ESP connection
     */
    getSubscribers: async (connectionId, token, onUnauthorized, page, limit, status) => {
        const params = new URLSearchParams();
        if (page)
            params.append('page', page.toString());
        if (limit)
            params.append('limit', limit.toString());
        if (status)
            params.append('status', status);
        const url = `/esp-connections/${connectionId}/subscribers${params.toString() ? `?${params.toString()}` : ''}`;
        return apiRequest(url, {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Export subscribers in specified format (CSV, JSON, or Excel)
     * Returns a Blob that can be used to trigger browser download
     */
    exportSubscribers: async (connectionId, format, token, onUnauthorized) => {
        const headers = {};
        // Add auth token if provided
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_URL}/esp-connections/${connectionId}/subscribers/export?format=${format}`, {
            method: 'GET',
            headers: headers,
        });
        // Handle 401 Unauthorized
        if (response.status === 401) {
            if (onUnauthorized) {
                onUnauthorized();
            }
            if (typeof window !== 'undefined' &&
                !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Export failed: ${response.statusText}`);
        }
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `subscribers.${format}`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }
        const blob = await response.blob();
        return { blob, filename };
    },
    /**
     * Initiate OAuth flow for ESP connection
     * Redirects user to OAuth provider's authorization page
     */
    initiateOAuth: async (provider, token, onUnauthorized, onboarding) => {
        if (!token) {
            throw new Error('Authentication token is required');
        }
        const headers = {
            Authorization: `Bearer ${token}`,
        };
        // Build URL with optional onboarding query parameter
        let url = `${API_URL}/esp-connections/oauth/initiate/${provider}`;
        if (onboarding) {
            url += '?onboarding=true';
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            redirect: 'manual', // Don't follow redirect automatically, we'll handle it
        });
        // Handle 401 Unauthorized
        if (response.status === 401) {
            if (onUnauthorized) {
                onUnauthorized();
            }
            if (typeof window !== 'undefined' &&
                !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
            throw new Error('Unauthorized');
        }
        // Handle redirect response (302, 301, etc.)
        if (response.status >= 300 && response.status < 400) {
            const redirectUrl = response.headers.get('Location');
            if (redirectUrl && typeof window !== 'undefined') {
                window.location.href = redirectUrl;
                return;
            }
        }
        // Handle errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `OAuth initiation failed: ${response.statusText}`);
        }
        // If we get here, something unexpected happened
        throw new Error('OAuth initiation did not redirect as expected');
    },
    /**
     * Delete an ESP connection
     * This will delete the connection and all associated subscribers and sync history
     */
    deleteConnection: async (connectionId, token, onUnauthorized) => {
        return apiRequest(`/esp-connections/${connectionId}`, {
            method: 'DELETE',
        }, token, onUnauthorized);
    },
    /**
     * Get available lists for ESP connection
     * Note: Different ESPs use different terminology (lists, segments, publications),
     * but the endpoint returns them as 'lists' for UI consistency.
     */
    getLists: async (connectionId, token, onUnauthorized) => {
        return apiRequest(`/esp-connections/${connectionId}/lists`, {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Update selected lists for ESP connection
     * Updates which lists are selected for syncing.
     */
    updateSelectedLists: async (connectionId, data, token, onUnauthorized) => {
        return apiRequest(`/esp-connections/${connectionId}/lists`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }, token, onUnauthorized);
    },
};
/**
 * Dashboard API functions
 */
export const dashboardApi = {
    /**
     * Get dashboard statistics
     */
    getStats: async (token, onUnauthorized) => {
        return apiRequest('/dashboard/stats', {
            method: 'GET',
        }, token, onUnauthorized);
    },
};
/**
 * Subscriber API functions
 */
export const subscriberApi = {
    /**
     * Unmask a subscriber's email address
     */
    unmaskEmail: async (subscriberId, token, onUnauthorized) => {
        return apiRequest(`/subscribers/${subscriberId}/unmask`, {
            method: 'POST',
        }, token, onUnauthorized);
    },
};
/**
 * Billing API functions
 */
export const billingApi = {
    /**
     * Create a Stripe Checkout session for subscription
     */
    createCheckoutSession: async (token, onUnauthorized) => {
        return apiRequest('/billing/create-checkout-session', {
            method: 'POST',
        }, token, onUnauthorized);
    },
    /**
     * Create a Stripe Customer Portal session
     */
    createPortalSession: async (token, onUnauthorized) => {
        return apiRequest('/billing/create-portal-session', {
            method: 'POST',
        }, token, onUnauthorized);
    },
    /**
     * Get billing status for the authenticated user
     */
    getBillingStatus: async (token, onUnauthorized) => {
        return apiRequest('/billing/status', {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Get current month's usage for the authenticated user
     */
    getCurrentUsage: async (token, onUnauthorized) => {
        return apiRequest('/billing/usage', {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Get billing history for the authenticated user
     */
    getBillingHistory: async (token, onUnauthorized, limit) => {
        const url = `/billing/history${limit ? `?limit=${limit}` : ''}`;
        return apiRequest(url, {
            method: 'GET',
        }, token, onUnauthorized);
    },
    /**
     * Verify Stripe Checkout session and create/update subscription
     */
    verifyCheckoutSession: async (token, sessionId, onUnauthorized) => {
        return apiRequest('/billing/verify-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
        }, token, onUnauthorized);
    },
};
/**
 * Account API functions
 */
export const accountApi = {
    /**
     * Request account deletion
     */
    deleteAccount: async (token, onUnauthorized) => {
        return apiRequest('/account/delete', {
            method: 'POST',
        }, token, onUnauthorized);
    },
};
