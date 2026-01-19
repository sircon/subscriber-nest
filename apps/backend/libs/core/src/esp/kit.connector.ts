import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Kit ESP Connector
 * Implements the IEspConnector interface for Kit API integration using OAuth authentication
 *
 * Kit uses OAuth 2.0 Bearer token authentication for API access.
 * The API provides access to publications and their subscribers.
 *
 * API Documentation: https://developers.kit.com/v4
 * API Version: v4 (current as of January 2026)
 */
@Injectable()
export class KitConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.kit.com/v4';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validates an API key by making a test request to the Kit API
   * Note: Kit uses OAuth, so this method is not used but required by interface
   * @param apiKey - The API key to validate (not used for Kit)
   * @param publicationId - Optional publication ID to validate against
   * @returns Promise<boolean> - Always returns false as Kit doesn't use API keys
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    // Kit doesn't support API key authentication, only OAuth
    return false;
  }

  /**
   * Fetches all publications available for the given API key
   * Note: Kit uses OAuth, so this method is not used but required by interface
   * @param apiKey - The API key to use for authentication (not used for Kit)
   * @returns Promise<Publication[]> - Always returns empty array
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    // Kit doesn't support API key authentication, only OAuth
    return [];
  }

  /**
   * Fetches all subscribers for a specific publication
   * Note: Kit uses OAuth, so this method is not used but required by interface
   * @param apiKey - The API key to use for authentication (not used for Kit)
   * @param publicationId - The publication ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - Always returns empty array
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    // Kit doesn't support API key authentication, only OAuth
    return [];
  }

  /**
   * Gets the total subscriber count for a specific publication
   * Note: Kit uses OAuth, so this method is not used but required by interface
   * @param apiKey - The API key to use for authentication (not used for Kit)
   * @param publicationId - The publication ID to get subscriber count for
   * @returns Promise<number> - Always returns 0
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    // Kit doesn't support API key authentication, only OAuth
    return 0;
  }

  /**
   * Validates an OAuth access token by making a test request to the Kit API
   * @param accessToken - The OAuth access token to validate
   * @returns Promise<boolean> - true if access token is valid, false otherwise
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      // Make a lightweight API call to validate the token
      // Using /publications endpoint as it's a common endpoint that requires authentication
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/publications`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      );

      // If status is 200, the access token is valid
      return response.status === 200;
    } catch (error: any) {
      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        // 401 = Unauthorized (invalid/expired access token)
        // 403 = Forbidden (valid token but no permission)
        if (status === 401 || status === 403) {
          return false;
        }
        // Other errors (429, 500, etc.) - log but return false
        console.error(
          `Kit API error during token validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Kit API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications available for the given OAuth access token
   * @param accessToken - The OAuth access token to use for authentication
   * @returns Promise<Publication[]> - List of publications
   */
  async fetchPublicationsWithOAuth(
    accessToken: string
  ): Promise<Publication[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/publications`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      );

      if (response.status === 200 && response.data) {
        // Handle different possible response structures
        const publications =
          response.data.data ||
          response.data.publications ||
          response.data ||
          [];

        return publications.map((pub: any) => ({
          id: pub.id || pub.publication_id || '',
          name: pub.name || pub.title || pub.publication_name || '',
          ...pub, // Include all other fields
        }));
      }

      return [];
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid access token: ${status}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Kit API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers for a specific publication with pagination support
   * @param accessToken - The OAuth access token to use for authentication
   * @param publicationId - The publication ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribersWithOAuth(
    accessToken: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(
            `${this.baseUrl}/publications/${publicationId}/subscribers`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              params: {
                page,
                limit: 100, // Common pagination limit
              },
            }
          )
        );

        if (response.status === 200 && response.data) {
          // Handle different possible response structures
          const subscribers =
            response.data.data ||
            response.data.subscribers ||
            response.data ||
            [];

          // Map Kit subscriber data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = subscribers.map(
            (sub: any) => ({
              id: sub.id || sub.subscriber_id || '',
              email: sub.email || '',
              status: this.mapKitStatus(sub.status),
              firstName: sub.first_name || sub.firstName || null,
              lastName: sub.last_name || sub.lastName || null,
              subscribedAt:
                sub.created_at || sub.subscribed_at || sub.subscribedAt || null,
              unsubscribedAt: sub.unsubscribed_at || sub.unsubscribedAt || null,
              ...sub, // Include all other Kit-specific fields
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check if there are more pages
          // Kit API typically returns pagination info in response
          const totalPages =
            response.data.total_pages ||
            response.data.pages ||
            response.data.meta?.total_pages ||
            1;
          const currentPage =
            response.data.page || response.data.meta?.page || page;
          const perPage =
            response.data.per_page ||
            response.data.limit ||
            response.data.meta?.per_page ||
            100;

          // If we got fewer results than the page size, we're done
          hasMore =
            subscribers.length === perPage &&
            (currentPage < totalPages || !totalPages);
          page++;
        } else {
          hasMore = false;
        }
      }

      return allSubscribers;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid access token: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Publication not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Kit API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Gets the total subscriber count for a specific publication
   * This is a lightweight method that only fetches the first page to get the total count
   * @param accessToken - The OAuth access token to use for authentication
   * @param publicationId - The publication ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCountWithOAuth(
    accessToken: string,
    publicationId: string
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/publications/${publicationId}/subscribers`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              page: 1,
              limit: 1, // Only fetch 1 subscriber to get the total count from metadata
            },
          }
        )
      );

      if (response.status === 200 && response.data) {
        // Kit API may return total_results, total, or meta.total in the response
        return (
          response.data.total_results ||
          response.data.total ||
          response.data.meta?.total ||
          response.data.meta?.total_results ||
          0
        );
      }

      return 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid access token: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Publication not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Kit API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Kit status values to our standard status format
   * @param kitStatus - The status from Kit API
   * @returns string - Mapped status value
   */
  private mapKitStatus(kitStatus: string): string {
    const statusMap: Record<string, string> = {
      active: 'active',
      subscribed: 'active',
      unsubscribed: 'unsubscribed',
      bounced: 'bounced',
      spam: 'bounced',
      invalid: 'bounced',
      pending: 'active',
      confirmed: 'active',
    };

    const normalized = (kitStatus || '').toLowerCase();
    return statusMap[normalized] || kitStatus || 'active';
  }
}
