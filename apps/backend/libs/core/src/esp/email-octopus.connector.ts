import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Email Octopus ESP Connector
 * Implements the IEspConnector interface for Email Octopus API integration
 *
 * Email Octopus uses API key authentication passed as a query parameter.
 * The API provides access to lists (publications) and their contacts (subscribers).
 *
 * API Documentation: https://emailoctopus.com/api-documentation
 */
@Injectable()
export class EmailOctopusConnector implements IEspConnector {
  private readonly baseUrl = 'https://emailoctopus.com/api/1.6';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validates an API key by making a test request to the Email Octopus API
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
          params: {
            api_key: apiKey,
          },
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          try {
            const listResponse = await firstValueFrom(
              this.httpService.get(`${this.baseUrl}/lists/${publicationId}`, {
                params: {
                  api_key: apiKey,
                },
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
        // 401 = Unauthorized (invalid API key)
        // 403 = Forbidden (valid API key but no permission)
        if (status === 401 || status === 403) {
          return false;
        }
        // Other errors (429, 500, etc.) - log but return false
        console.error(
          `Email Octopus API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Email Octopus API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (lists) available for the given API key
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of email lists as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    const allPublications: Publication[] = [];
    let page = 1;
    let hasMore = true;
    const limit = 100; // Email Octopus default limit

    try {
      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/lists`, {
            params: {
              api_key: apiKey,
              limit,
              page,
            },
          })
        );

        if (response.status === 200 && response.data) {
          const lists = response.data.data || [];

          const mappedLists: Publication[] = lists.map((list: any) => ({
            id: list.id,
            name: list.name || '',
            createdAt: list.created_at,
            ...list,
          }));

          allPublications.push(...mappedLists);

          // Check pagination using paging object
          const paging = response.data.paging;
          hasMore = paging && paging.next !== null && lists.length === limit;
          page++;
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
          throw new Error(`Email Octopus API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers (contacts) for a specific list with pagination support
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The list ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];
    let page = 1;
    let hasMore = true;
    const limit = 100; // Email Octopus default limit

    try {
      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(
            `${this.baseUrl}/lists/${publicationId}/contacts`,
            {
              params: {
                api_key: apiKey,
                limit,
                page,
              },
            }
          )
        );

        if (response.status === 200 && response.data) {
          const contacts = response.data.data || [];

          // Map Email Octopus contact data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = contacts.map(
            (contact: any) => ({
              id: contact.id || contact.email_address || '',
              email: contact.email_address || '',
              status: this.mapEmailOctopusStatus(contact.status),
              firstName: contact.fields?.FirstName || null,
              lastName: contact.fields?.LastName || null,
              subscribedAt: contact.created_at || null,
              unsubscribedAt:
                contact.status === 'UNSUBSCRIBED'
                  ? contact.updated_at || null
                  : null,
              customFields: contact.fields || {},
              tags: contact.tags || [],
              ...contact,
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check pagination using paging object
          const paging = response.data.paging;
          hasMore = paging && paging.next !== null && contacts.length === limit;
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
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404) {
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Email Octopus API server error: ${status}`);
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
   * Uses the list details endpoint which includes counts
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
        this.httpService.get(`${this.baseUrl}/lists/${publicationId}`, {
          params: {
            api_key: apiKey,
          },
        })
      );

      if (response.status === 200 && response.data) {
        // Email Octopus returns counts in the list details
        const counts = response.data.counts || {};
        return (
          counts.subscribed ||
          counts.total ||
          response.data.subscriber_count ||
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
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Email Octopus API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Email Octopus status values to our standard status format
   * @param eoStatus - The status from Email Octopus API
   * @returns string - Mapped status value
   */
  private mapEmailOctopusStatus(eoStatus: string): string {
    const statusMap: Record<string, string> = {
      SUBSCRIBED: 'active',
      subscribed: 'active',
      UNSUBSCRIBED: 'unsubscribed',
      unsubscribed: 'unsubscribed',
      PENDING: 'pending',
      pending: 'pending',
      BOUNCED: 'bounced',
      bounced: 'bounced',
    };

    return statusMap[eoStatus] || eoStatus || 'active';
  }
}
