import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * PostUp ESP Connector
 * Implements the IEspConnector interface for PostUp API integration
 *
 * PostUp uses Basic Auth with username and password.
 * API key format: "username:password" (colon-separated)
 *
 * The API provides access to lists (publications) and their recipients (subscribers).
 *
 * API Documentation: https://api.postup.com/docs/
 */
@Injectable()
export class PostUpConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.postup.com/api';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Parses the compound API key into username and password
   * API key format: "username:password"
   * @param apiKey - The compound API key
   * @returns { username: string, password: string }
   */
  private parseApiKey(apiKey: string): { username: string; password: string } {
    const colonIndex = apiKey.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(
        'Invalid API key format. Expected "username:password" format.'
      );
    }
    const username = apiKey.substring(0, colonIndex);
    const password = apiKey.substring(colonIndex + 1);
    return { username, password };
  }

  /**
   * Gets the authorization headers for PostUp API requests
   * PostUp uses Basic Auth with username:password
   * @param apiKey - The compound API key (username:password)
   * @returns Record<string, string> - Headers object with authorization
   */
  private getHeaders(apiKey: string): Record<string, string> {
    const { username, password } = this.parseApiKey(apiKey);
    const credentials = Buffer.from(`${username}:${password}`).toString(
      'base64'
    );
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Validates an API key by making a test request to the PostUp API
   * @param apiKey - The API key to validate (username:password format)
   * @param publicationId - Optional publication (list) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      // Use /list endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/list`, {
          headers: this.getHeaders(apiKey),
          params: {
            limit: 1,
          },
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          try {
            const listResponse = await firstValueFrom(
              this.httpService.get(`${this.baseUrl}/list/${publicationId}`, {
                headers: this.getHeaders(apiKey),
              })
            );
            return listResponse.status === 200;
          } catch {
            return false;
          }
        }
        return true;
      }

      return false;
    } catch (error: any) {
      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        // 401 = Unauthorized (invalid credentials)
        // 403 = Forbidden (valid credentials but no permission)
        if (status === 401 || status === 403) {
          return false;
        }
        // Other errors (429, 500, etc.) - log but return false
        console.error(
          `PostUp API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('PostUp API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (lists) available for the given API key
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of mailing lists as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    const allPublications: Publication[] = [];
    let offset = 0;
    const limit = 100; // PostUp pagination limit
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/list`, {
            headers: this.getHeaders(apiKey),
            params: {
              limit,
              offset,
            },
          })
        );

        if (response.status === 200 && response.data) {
          // PostUp returns lists as an array
          const lists = Array.isArray(response.data)
            ? response.data
            : response.data.lists || response.data.data || [];

          const mappedLists: Publication[] = lists.map((list: any) => ({
            id: String(list.listId || list.id),
            name: list.listName || list.name || '',
            description: list.description,
            createdAt: list.createDate || list.createdAt,
            status: list.status,
            subscriberCount: list.recipientCount || list.subscriberCount,
            ...list,
          }));

          allPublications.push(...mappedLists);

          // Check if there are more pages
          if (lists.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        } else {
          hasMore = false;
        }
      }

      return allPublications;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API credentials: ${status}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`PostUp API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers (recipients) for a specific list with pagination support
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The list ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];
    let offset = 0;
    const limit = 500; // PostUp supports up to 500 per request
    let hasMore = true;

    try {
      while (hasMore) {
        // PostUp uses /recipient endpoint with listId filter
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/recipient`, {
            headers: this.getHeaders(apiKey),
            params: {
              listId: publicationId,
              limit,
              offset,
            },
          })
        );

        if (response.status === 200 && response.data) {
          // PostUp returns recipients as an array
          const recipients = Array.isArray(response.data)
            ? response.data
            : response.data.recipients || response.data.data || [];

          // Map PostUp recipient data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = recipients.map(
            (recipient: any) => ({
              id: String(recipient.recipientId || recipient.id),
              email: recipient.address || recipient.email || '',
              status: this.mapPostUpStatus(recipient.status),
              firstName:
                recipient.firstName ||
                recipient.demographics?.firstName ||
                null,
              lastName:
                recipient.lastName || recipient.demographics?.lastName || null,
              subscribedAt:
                recipient.createDate ||
                recipient.subscribeDate ||
                recipient.createdAt ||
                null,
              unsubscribedAt:
                recipient.unsubscribeDate || recipient.unsubscribedAt || null,
              customFields: recipient.demographics || {},
              externalId: recipient.externalId,
              ...recipient,
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check if there are more pages
          if (recipients.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        } else {
          hasMore = false;
        }
      }

      return allSubscribers;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API credentials: ${status}`);
        }
        if (status === 404) {
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`PostUp API server error: ${status}`);
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
   * Uses the list details endpoint which includes recipient count
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The list ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/list/${publicationId}`, {
          headers: this.getHeaders(apiKey),
        })
      );

      if (response.status === 200 && response.data) {
        // PostUp returns recipient count in list details
        const data = response.data;
        return (
          data.recipientCount ||
          data.subscriberCount ||
          data.activeCount ||
          data.count ||
          0
        );
      }

      return 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API credentials: ${status}`);
        }
        if (status === 404) {
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`PostUp API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps PostUp status values to our standard status format
   * PostUp uses: A=Active, U=Unsubscribed, H=Hard Bounce, S=Soft Bounce, C=Complaint
   * @param postupStatus - The status from PostUp API
   * @returns string - Mapped status value
   */
  private mapPostUpStatus(postupStatus: string): string {
    if (!postupStatus) {
      return 'active';
    }

    const statusMap: Record<string, string> = {
      // Single character status codes
      A: 'active',
      U: 'unsubscribed',
      H: 'bounced',
      S: 'bounced',
      C: 'unsubscribed', // Complaint = treat as unsubscribed
      P: 'pending',
      // Full status names
      active: 'active',
      Active: 'active',
      ACTIVE: 'active',
      subscribed: 'active',
      Subscribed: 'active',
      SUBSCRIBED: 'active',
      unsubscribed: 'unsubscribed',
      Unsubscribed: 'unsubscribed',
      UNSUBSCRIBED: 'unsubscribed',
      bounced: 'bounced',
      Bounced: 'bounced',
      BOUNCED: 'bounced',
      hardbounce: 'bounced',
      softbounce: 'bounced',
      complaint: 'unsubscribed',
      pending: 'pending',
      Pending: 'pending',
      PENDING: 'pending',
    };

    return statusMap[postupStatus] || 'active';
  }
}
