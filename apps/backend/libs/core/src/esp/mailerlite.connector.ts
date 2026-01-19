import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * MailerLite ESP Connector
 * Implements the IEspConnector interface for MailerLite API integration
 *
 * MailerLite uses API key authentication passed as a Bearer token.
 * The API provides access to groups (publications) and their subscribers.
 *
 * API Documentation: https://developers.mailerlite.com/docs
 * API Version: Current Connect API (no versioning in URL, current as of January 2026)
 */
@Injectable()
export class MailerLiteConnector implements IEspConnector {
  private readonly baseUrl = 'https://connect.mailerlite.com/api';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validates an API key by making a test request to the MailerLite API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication (group) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      // Use /groups endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/groups`, {
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
            const groupResponse = await firstValueFrom(
              this.httpService.get(`${this.baseUrl}/groups/${publicationId}`, {
                headers: this.getHeaders(apiKey),
              })
            );
            return groupResponse.status === 200;
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
        // 401 = Unauthorized (invalid API key)
        // 403 = Forbidden (valid API key but no permission)
        if (status === 401 || status === 403) {
          return false;
        }
        // Other errors (429, 500, etc.) - log but return false
        console.error(
          `MailerLite API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('MailerLite API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (groups) available for the given API key
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of groups as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    const allPublications: Publication[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    const limit = 50; // MailerLite default/max limit per page

    try {
      while (hasMore) {
        const params: Record<string, any> = { limit };
        if (cursor) {
          params.cursor = cursor;
        }

        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/groups`, {
            headers: this.getHeaders(apiKey),
            params,
          })
        );

        if (response.status === 200 && response.data) {
          const groups = response.data.data || [];

          const mappedGroups: Publication[] = groups.map((group: any) => ({
            id: String(group.id),
            name: group.name || '',
            createdAt: group.created_at,
            activeCount: group.active_count,
            sentCount: group.sent_count,
            opensCount: group.opens_count,
            ...group,
          }));

          allPublications.push(...mappedGroups);

          // Check pagination using links object
          const links = response.data.links;
          const meta = response.data.meta;
          
          if (links?.next) {
            // Extract cursor from next URL
            const nextUrl = new URL(links.next);
            cursor = nextUrl.searchParams.get('cursor');
            hasMore = cursor !== null;
          } else if (meta?.next_cursor) {
            cursor = meta.next_cursor;
            hasMore = cursor !== null;
          } else {
            hasMore = false;
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
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`MailerLite API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers for a specific group with pagination support
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The group ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    const limit = 100; // MailerLite max limit per page

    try {
      while (hasMore) {
        const params: Record<string, any> = {
          limit,
          'filter[group]': publicationId,
        };
        if (cursor) {
          params.cursor = cursor;
        }

        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/subscribers`, {
            headers: this.getHeaders(apiKey),
            params,
          })
        );

        if (response.status === 200 && response.data) {
          const subscribers = response.data.data || [];

          // Map MailerLite subscriber data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = subscribers.map(
            (subscriber: any) => ({
              id: String(subscriber.id) || subscriber.email || '',
              email: subscriber.email || '',
              status: this.mapMailerLiteStatus(subscriber.status),
              firstName: subscriber.fields?.name || subscriber.fields?.first_name || null,
              lastName: subscriber.fields?.last_name || null,
              subscribedAt: subscriber.subscribed_at || subscriber.created_at || null,
              unsubscribedAt: subscriber.unsubscribed_at || null,
              customFields: subscriber.fields || {},
              tags: (subscriber.tags || []).map((tag: any) => tag.name || tag),
              ipAddress: subscriber.ip_address,
              ...subscriber,
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check pagination using links or meta
          const links = response.data.links;
          const meta = response.data.meta;
          
          if (links?.next) {
            // Extract cursor from next URL
            const nextUrl = new URL(links.next);
            cursor = nextUrl.searchParams.get('cursor');
            hasMore = cursor !== null;
          } else if (meta?.next_cursor) {
            cursor = meta.next_cursor;
            hasMore = cursor !== null;
          } else {
            hasMore = false;
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
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Group not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`MailerLite API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Gets the total subscriber count for a specific group
   * Uses the group details endpoint which includes counts
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The group ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/groups/${publicationId}`, {
          headers: this.getHeaders(apiKey),
        })
      );

      if (response.status === 200 && response.data) {
        // MailerLite returns counts in the group details
        const data = response.data.data || response.data;
        return (
          data.active_count ||
          data.total_count ||
          data.subscribers_count ||
          0
        );
      }

      return 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Group not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`MailerLite API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Gets the authorization headers for MailerLite API requests
   * @param apiKey - The API key to use for authentication
   * @returns Record<string, string> - Headers object with authorization
   */
  private getHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Maps MailerLite status values to our standard status format
   * @param mlStatus - The status from MailerLite API
   * @returns string - Mapped status value
   */
  private mapMailerLiteStatus(mlStatus: string): string {
    const statusMap: Record<string, string> = {
      active: 'active',
      Active: 'active',
      ACTIVE: 'active',
      subscribed: 'active',
      unsubscribed: 'unsubscribed',
      Unsubscribed: 'unsubscribed',
      UNSUBSCRIBED: 'unsubscribed',
      bounced: 'bounced',
      Bounced: 'bounced',
      BOUNCED: 'bounced',
      junk: 'unsubscribed',
      Junk: 'unsubscribed',
      JUNK: 'unsubscribed',
      unconfirmed: 'pending',
      Unconfirmed: 'pending',
      UNCONFIRMED: 'pending',
    };

    return statusMap[mlStatus] || mlStatus || 'active';
  }
}
