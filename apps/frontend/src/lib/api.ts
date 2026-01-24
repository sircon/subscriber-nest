/**
 * API client for AudienceSafe backend
 *
 * Provides typed functions for all backend endpoints with automatic
 * authentication token handling and 401 error management.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Types for API requests and responses
export interface User {
  id: string;
  email: string;
  isOnboarded: boolean;
  deleteRequestedAt: Date | string | null;
}

export interface SendCodeRequest {
  email: string;
}

export interface SendCodeResponse {
  success: true;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface VerifyCodeResponse {
  token: string;
  user: User;
}

export interface GetCurrentUserResponse {
  user: User;
}

export interface LogoutResponse {
  success: true;
}

export interface CompleteOnboardingResponse {
  success: true;
  user: User;
}

export interface CreateEspConnectionRequest {
  espType: string;
  apiKey: string;
}

export interface CreateEspConnectionResponse {
  id: string;
  userId: string;
  espType: string;
  publicationId: string | null;
  status: string;
  lastValidatedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EspConnection {
  id: string;
  userId: string;
  espType: string;
  authMethod: 'api_key' | 'oauth';
  publicationId: string | null;
  publicationIds: string[] | null;
  listNames: string[] | null;
  status: string;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  tokenExpiresAt: string | null;
  lastValidatedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * List interface for ESP connections
 * Note: Different ESPs use different terminology (lists, segments, publications),
 * but we expose them as 'lists' in the frontend for clarity.
 */
export interface List {
  id: string;
  name: string;
  subscriberCount?: number;
  description?: string;
  createdAt?: string | Date;
  [key: string]: any; // Allow additional ESP-specific fields
}

export interface SubscriberStats {
  active: number;
  unsubscribed: number;
  total: number;
}

export interface UpdateSelectedListsRequest {
  selectedListIds: string[];
}

export interface DashboardStats {
  totalEspConnections: number;
  totalSubscribers: number;
  lastSyncTime: string | null;
}

export interface SyncHistory {
  id: string;
  espConnectionId: string;
  status: 'success' | 'failed';
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface Subscriber {
  id: string;
  espConnectionId: string;
  externalId: string;
  maskedEmail: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  firstName: string | null;
  lastName: string | null;
  subscribedAt: string | null;
  unsubscribedAt: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSubscriber extends Subscriber {
  espType: string;
}

export interface PaginatedSubscribers {
  data: Subscriber[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedDashboardSubscribers {
  data: DashboardSubscriber[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error handling callback type
type OnUnauthorizedCallback = () => void;

/**
 * Base API request function with automatic auth token handling and 401 error management
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token: string | null = null,
  onUnauthorized?: OnUnauthorizedCallback
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: headers as HeadersInit,
  });

  // Handle 401 Unauthorized - clear auth and redirect to login
  if (response.status === 401) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    // Redirect to login if we're not already there
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API request failed: ${response.statusText}`
    );
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
  sendCode: async (data: SendCodeRequest): Promise<SendCodeResponse> => {
    return apiRequest<SendCodeResponse>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Verify code and create session
   */
  verifyCode: async (data: VerifyCodeRequest): Promise<VerifyCodeResponse> => {
    return apiRequest<VerifyCodeResponse>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<GetCurrentUserResponse> => {
    return apiRequest<GetCurrentUserResponse>(
      '/auth/me',
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Logout and invalidate session
   */
  logout: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<LogoutResponse> => {
    return apiRequest<LogoutResponse>(
      '/auth/logout',
      {
        method: 'POST',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Mark user as onboarded
   */
  completeOnboarding: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<CompleteOnboardingResponse> => {
    return apiRequest<CompleteOnboardingResponse>(
      '/auth/complete-onboarding',
      {
        method: 'POST',
      },
      token,
      onUnauthorized
    );
  },
};

export interface TriggerSyncResponse {
  jobId: string;
  status: string;
  message: string;
  connection: EspConnection;
}

/**
 * ESP Connection API functions
 */
export const espConnectionApi = {
  /**
   * Create a new ESP connection
   */
  createConnection: async (
    data: CreateEspConnectionRequest,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<CreateEspConnectionResponse> => {
    return apiRequest<CreateEspConnectionResponse>(
      '/esp-connections',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get user's ESP connections
   */
  getUserConnections: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<EspConnection[]> => {
    return apiRequest<EspConnection[]>(
      '/esp-connections',
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Trigger manual sync for ESP connection
   */
  triggerSync: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<TriggerSyncResponse> => {
    return apiRequest<TriggerSyncResponse>(
      `/esp-connections/${connectionId}/sync`,
      {
        method: 'POST',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get sync history for ESP connection
   */
  getSyncHistory: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
    limit?: number
  ): Promise<SyncHistory[]> => {
    const url = `/esp-connections/${connectionId}/sync-history${limit ? `?limit=${limit}` : ''}`;
    return apiRequest<SyncHistory[]>(
      url,
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get single ESP connection by ID
   */
  getConnection: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<EspConnection> => {
    return apiRequest<EspConnection>(
      `/esp-connections/${connectionId}`,
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get subscriber count from ESP API for a connection
   * This is a lightweight call that returns just the count
   */
  getSubscriberCount: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<{ count: number }> => {
    return apiRequest<{ count: number }>(
      `/esp-connections/${connectionId}/subscriber-count`,
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get connection-wide subscriber stats (active/unsubscribed/total)
   */
  getSubscriberStats: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<SubscriberStats> => {
    return apiRequest<SubscriberStats>(
      `/esp-connections/${connectionId}/subscriber-stats`,
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get paginated subscribers for ESP connection
   */
  getSubscribers: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
    page?: number,
    limit?: number,
    status?: string
  ): Promise<PaginatedSubscribers> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (status) params.append('status', status);

    const url = `/esp-connections/${connectionId}/subscribers${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<PaginatedSubscribers>(
      url,
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Export subscribers in specified format (CSV, JSON, or Excel)
   * Returns a Blob that can be used to trigger browser download
   */
  exportSubscribers: async (
    connectionId: string,
    format: 'csv' | 'json' | 'xlsx',
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<{ blob: Blob; filename: string }> => {
    const headers: Record<string, string> = {};

    // Add auth token if provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_URL}/esp-connections/${connectionId}/subscribers/export?format=${format}`,
      {
        method: 'GET',
        headers: headers as HeadersInit,
      }
    );

    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (onUnauthorized) {
        onUnauthorized();
      }
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Export failed: ${response.statusText}`
      );
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
  initiateOAuth: async (
    provider: 'kit' | 'mailchimp',
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
    onboarding?: boolean
  ): Promise<void> => {
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    // Build URL with optional onboarding query parameter
    let url = `${API_URL}/esp-connections/oauth/initiate/${provider}`;
    if (onboarding) {
      url += '?onboarding=true';
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: headers as HeadersInit,
      redirect: 'manual', // Don't follow redirect automatically, we'll handle it
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (onUnauthorized) {
        onUnauthorized();
      }
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
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
      throw new Error(
        errorData.message || `OAuth initiation failed: ${response.statusText}`
      );
    }

    // If we get here, something unexpected happened
    throw new Error('OAuth initiation did not redirect as expected');
  },

  /**
   * Delete an ESP connection
   * This will delete the connection and all associated subscribers and sync history
   */
  deleteConnection: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<void> => {
    return apiRequest<void>(
      `/esp-connections/${connectionId}`,
      {
        method: 'DELETE',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get available lists for ESP connection
   * Note: Different ESPs use different terminology (lists, segments, publications),
   * but the endpoint returns them as 'lists' for UI consistency.
   */
  getLists: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<List[]> => {
    return apiRequest<List[]>(
      `/esp-connections/${connectionId}/lists`,
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Update selected lists for ESP connection
   * Updates which lists are selected for syncing.
   */
  updateSelectedLists: async (
    connectionId: string,
    data: UpdateSelectedListsRequest,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<EspConnection> => {
    return apiRequest<EspConnection>(
      `/esp-connections/${connectionId}/lists`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      token,
      onUnauthorized
    );
  },
};

/**
 * Dashboard API functions
 */
export const dashboardApi = {
  /**
   * Get dashboard statistics
   */
  getStats: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<DashboardStats> => {
    return apiRequest<DashboardStats>(
      '/dashboard/stats',
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get paginated subscribers across all connections
   */
  getSubscribers: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
    page?: number,
    limit?: number
  ): Promise<PaginatedDashboardSubscribers> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const url = `/dashboard/subscribers${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<PaginatedDashboardSubscribers>(
      url,
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },
};

export interface UnmaskEmailResponse {
  email: string;
}

/**
 * Subscriber API functions
 */
export const subscriberApi = {
  /**
   * Unmask a subscriber's email address
   */
  unmaskEmail: async (
    subscriberId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<UnmaskEmailResponse> => {
    return apiRequest<UnmaskEmailResponse>(
      `/subscribers/${subscriberId}/unmask`,
      {
        method: 'POST',
      },
      token,
      onUnauthorized
    );
  },
};

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface CreatePortalSessionResponse {
  url: string;
}

export interface BillingStatusResponse {
  hasActiveSubscription: boolean;
  subscription: {
    id: string;
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  currentPeriodEnd: string | null;
}

export interface CurrentUsageResponse {
  maxSubscriberCount: number;
  calculatedAmount: number;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
}

export interface BillingHistoryItem {
  billingPeriodStart: string;
  billingPeriodEnd: string;
  maxSubscriberCount: number;
  calculatedAmount: number;
  status: string;
  stripeInvoiceId: string | null;
}

export interface BillingSubscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyCheckoutSessionRequest {
  sessionId: string;
}

export interface VerifyCheckoutSessionResponse {
  success: true;
  subscription: BillingSubscription;
}

/**
 * Billing API functions
 */
export const billingApi = {
  /**
   * Create a Stripe Checkout session for subscription
   */
  createCheckoutSession: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<CreateCheckoutSessionResponse> => {
    return apiRequest<CreateCheckoutSessionResponse>(
      '/billing/create-checkout-session',
      {
        method: 'POST',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Create a Stripe Customer Portal session
   */
  createPortalSession: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<CreatePortalSessionResponse> => {
    return apiRequest<CreatePortalSessionResponse>(
      '/billing/create-portal-session',
      {
        method: 'POST',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get billing status for the authenticated user
   */
  getBillingStatus: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<BillingStatusResponse> => {
    return apiRequest<BillingStatusResponse>(
      '/billing/status',
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get current month's usage for the authenticated user
   */
  getCurrentUsage: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<CurrentUsageResponse> => {
    return apiRequest<CurrentUsageResponse>(
      '/billing/usage',
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Get billing history for the authenticated user
   */
  getBillingHistory: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
    limit?: number
  ): Promise<BillingHistoryItem[]> => {
    const url = `/billing/history${limit ? `?limit=${limit}` : ''}`;
    return apiRequest<BillingHistoryItem[]>(
      url,
      {
        method: 'GET',
      },
      token,
      onUnauthorized
    );
  },

  /**
   * Verify Stripe Checkout session and create/update subscription
   */
  verifyCheckoutSession: async (
    token: string | null,
    sessionId: string,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<VerifyCheckoutSessionResponse> => {
    return apiRequest<VerifyCheckoutSessionResponse>(
      '/billing/verify-checkout-session',
      {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      },
      token,
      onUnauthorized
    );
  },
};

export interface DeleteAccountResponse {
  message: string;
}

/**
 * Account API functions
 */
export const accountApi = {
  /**
   * Request account deletion
   */
  deleteAccount: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback
  ): Promise<DeleteAccountResponse> => {
    return apiRequest<DeleteAccountResponse>(
      '/account/delete',
      {
        method: 'POST',
      },
      token,
      onUnauthorized
    );
  },
};
