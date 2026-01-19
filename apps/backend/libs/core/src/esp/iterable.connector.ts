import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Iterable ESP Connector
 * Implements the IEspConnector interface for Iterable API integration
 *
 * Iterable uses API key authentication via the `Api-Key` header.
 *
 * API Documentation: https://api.iterable.com/api/docs
 * API Version: Current REST API (no versioning in URL, current as of January 2026)
 */
@Injectable()
export class IterableConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.iterable.com/api';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Gets the authorization headers for Iterable API requests
   * Iterable uses API key authentication via Api-Key header
   * @param apiKey - The API key
   * @returns Record<string, string> - Headers object with authorization
   */
  private getHeaders(apiKey: string): Record<string, string> {
    return {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Validates an API key by making a test request to the Iterable API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication (list) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      // Use /lists endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/lists`, {
          headers: this.getHeaders(apiKey),
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          const lists = response.data.lists || [];
          const listExists = lists.some(
            (list: any) => String(list.id) === String(publicationId)
          );
          return listExists;
        }
        return true;
      }

      return false;
    } catch (error: any) {
      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        // 401 = Unauthorized (invalid API key)
        // 403 = Forbidden (valid key but no permission)
        if (status === 401 || status === 403) {
          return false;
        }
        // Other errors (429, 500, etc.) - log but return false
        console.error(
          `Iterable API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Iterable API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (lists) available for the given API key
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of mailing lists as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/lists`, {
          headers: this.getHeaders(apiKey),
        })
      );

      if (response.status === 200 && response.data) {
        const lists = response.data.lists || [];

        const mappedLists: Publication[] = lists.map((list: any) => ({
          id: String(list.id),
          name: list.name || '',
          description: list.description,
          createdAt: list.createdAt,
          listType: list.listType,
          subscriberCount: list.size || 0,
          ...list,
        }));

        return mappedLists;
      }

      return [];
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Iterable API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers (users) for a specific list with pagination support
   * Iterable's getUsers endpoint returns users in batches
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The list ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];

    try {
      // Iterable uses the /lists/getUsers endpoint for fetching list members
      // This endpoint returns user IDs, then we need to fetch user details separately
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/lists/getUsers`, {
          headers: this.getHeaders(apiKey),
          params: {
            listId: publicationId,
          },
        })
      );

      if (response.status === 200 && response.data) {
        // getUsers returns an array of user emails or user IDs
        const users = response.data.users || response.data || [];

        // Fetch full user details for each user
        for (const userIdentifier of users) {
          try {
            const userEmail =
              typeof userIdentifier === 'string'
                ? userIdentifier
                : userIdentifier.email;

            if (!userEmail) {
              continue;
            }

            const userResponse = await firstValueFrom(
              this.httpService.get(
                `${this.baseUrl}/users/${encodeURIComponent(userEmail)}`,
                {
                  headers: this.getHeaders(apiKey),
                }
              )
            );

            if (userResponse.status === 200 && userResponse.data) {
              const user = userResponse.data.user || userResponse.data;

              const subscriber: SubscriberData = {
                id: user.userId || user.email,
                email: user.email || '',
                status: this.mapIterableStatus(user),
                firstName: user.dataFields?.firstName || null,
                lastName: user.dataFields?.lastName || null,
                subscribedAt: user.signupDate || user.createdAt || null,
                unsubscribedAt: user.unsubscribedChannelIds?.length
                  ? new Date().toISOString()
                  : null,
                customFields: user.dataFields || {},
                phoneNumber: user.phoneNumber,
                userId: user.userId,
                ...user,
              };

              allSubscribers.push(subscriber);
            }
          } catch (userError: any) {
            // Log but continue with other users if one fails
            console.warn(
              `Failed to fetch user details for ${userIdentifier}:`,
              userError.message
            );
          }
        }
      }

      return allSubscribers;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404) {
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Iterable API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Gets the total subscriber count for a specific list
   * Uses the lists endpoint which includes size information
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The list ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      // Fetch all lists and find the one matching publicationId
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/lists`, {
          headers: this.getHeaders(apiKey),
        })
      );

      if (response.status === 200 && response.data) {
        const lists = response.data.lists || [];
        const targetList = lists.find(
          (list: any) => String(list.id) === String(publicationId)
        );

        if (targetList) {
          return targetList.size || 0;
        }

        // List not found - throw error
        throw new Error(`List not found: ${publicationId}`);
      }

      return 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Iterable API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      // Re-throw if it's already an error we created
      if (error.message?.includes('List not found')) {
        throw error;
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Iterable user status to our standard status format
   * @param user - The user object from Iterable API
   * @returns string - Mapped status value
   */
  private mapIterableStatus(user: any): string {
    // Check for unsubscribed channels - if email is unsubscribed, user is unsubscribed
    if (user.unsubscribedChannelIds?.includes(0)) {
      // Channel 0 is typically email
      return 'unsubscribed';
    }

    // Check email subscription status
    if (user.emailListIds && !user.emailListIds.length) {
      return 'unsubscribed';
    }

    // Check for specific unsubscribed flags
    if (user.unsubscribed === true) {
      return 'unsubscribed';
    }

    // Check for bounced emails
    if (user.bounced === true || user.hardBounced === true) {
      return 'bounced';
    }

    // Check for complaints/spam
    if (user.spamComplaint === true) {
      return 'complained';
    }

    // Check verification status
    if (user.emailVerified === false) {
      return 'pending';
    }

    // Default to active/subscribed
    return 'active';
  }
}
