/**
 * API client for SubscriberNest backend
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
  publicationId: string;
}

export interface CreateEspConnectionResponse {
  id: string;
  userId: string;
  espType: string;
  publicationId: string;
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
  publicationId: string;
  status: string;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastValidatedAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  onUnauthorized?: OnUnauthorizedCallback,
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
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
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
    onUnauthorized?: OnUnauthorizedCallback,
  ): Promise<GetCurrentUserResponse> => {
    return apiRequest<GetCurrentUserResponse>(
      '/auth/me',
      {
        method: 'GET',
      },
      token,
      onUnauthorized,
    );
  },

  /**
   * Logout and invalidate session
   */
  logout: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
  ): Promise<LogoutResponse> => {
    return apiRequest<LogoutResponse>(
      '/auth/logout',
      {
        method: 'POST',
      },
      token,
      onUnauthorized,
    );
  },

  /**
   * Mark user as onboarded
   */
  completeOnboarding: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
  ): Promise<CompleteOnboardingResponse> => {
    return apiRequest<CompleteOnboardingResponse>(
      '/auth/complete-onboarding',
      {
        method: 'POST',
      },
      token,
      onUnauthorized,
    );
  },
};

export interface TriggerSyncResponse {
  connection: EspConnection;
  jobId: string;
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
    onUnauthorized?: OnUnauthorizedCallback,
  ): Promise<CreateEspConnectionResponse> => {
    return apiRequest<CreateEspConnectionResponse>(
      '/esp-connections',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token,
      onUnauthorized,
    );
  },

  /**
   * Get user's ESP connections
   */
  getUserConnections: async (
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
  ): Promise<EspConnection[]> => {
    return apiRequest<EspConnection[]>(
      '/esp-connections',
      {
        method: 'GET',
      },
      token,
      onUnauthorized,
    );
  },

  /**
   * Trigger manual sync for ESP connection
   */
  triggerSync: async (
    connectionId: string,
    token: string | null,
    onUnauthorized?: OnUnauthorizedCallback,
  ): Promise<TriggerSyncResponse> => {
    return apiRequest<TriggerSyncResponse>(
      `/esp-connections/${connectionId}/sync`,
      {
        method: 'POST',
      },
      token,
      onUnauthorized,
    );
  },
};
