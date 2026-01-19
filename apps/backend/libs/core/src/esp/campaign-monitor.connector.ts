import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Campaign Monitor ESP Connector
 * Implements the IEspConnector interface for Campaign Monitor API integration
 *
 * Campaign Monitor uses Basic Authentication with API key as username and empty password.
 * The API provides access to clients and their subscriber lists.
 *
 * API Documentation: https://www.campaignmonitor.com/api/v3.2/
 */
@Injectable()
export class CampaignMonitorConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.createsend.com/api/v3.2';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Creates Basic Auth header from API key
   * Campaign Monitor uses API key as username with empty password
   * @param apiKey - The API key to use
   * @returns Basic Auth header value
   */
  private getAuthHeader(apiKey: string): string {
    const credentials = Buffer.from(`${apiKey}:`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Validates an API key by making a test request to the Campaign Monitor API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication (list) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      // Use /clients.json endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/clients.json`, {
          headers: {
            Authorization: this.getAuthHeader(apiKey),
          },
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          try {
            const listResponse = await firstValueFrom(
              this.httpService.get(
                `${this.baseUrl}/lists/${publicationId}.json`,
                {
                  headers: {
                    Authorization: this.getAuthHeader(apiKey),
                  },
                }
              )
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
          `Campaign Monitor API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Campaign Monitor API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (subscriber lists) available for the given API key
   * Campaign Monitor organizes lists under clients, so we fetch all clients and their lists
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of subscriber lists as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      // First, get all clients
      const clientsResponse = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/clients.json`, {
          headers: {
            Authorization: this.getAuthHeader(apiKey),
          },
        })
      );

      if (clientsResponse.status !== 200 || !clientsResponse.data) {
        return [];
      }

      const clients = clientsResponse.data || [];
      const allPublications: Publication[] = [];

      // For each client, fetch their subscriber lists
      for (const client of clients) {
        try {
          const listsResponse = await firstValueFrom(
            this.httpService.get(
              `${this.baseUrl}/clients/${client.ClientID}/lists.json`,
              {
                headers: {
                  Authorization: this.getAuthHeader(apiKey),
                },
              }
            )
          );

          if (listsResponse.status === 200 && listsResponse.data) {
            const lists = listsResponse.data || [];
            const mappedLists: Publication[] = lists.map((list: any) => ({
              id: list.ListID,
              name: list.Name || '',
              clientId: client.ClientID,
              clientName: client.Name,
              ...list,
            }));
            allPublications.push(...mappedLists);
          }
        } catch (error: any) {
          // Log but continue with other clients
          console.error(
            `Failed to fetch lists for client ${client.ClientID}:`,
            error.message
          );
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
          throw new Error(`Campaign Monitor API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers for a specific list with pagination support
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
    const pageSize = 1000; // Campaign Monitor supports up to 1000 per page

    try {
      while (hasMore) {
        // Fetch active subscribers
        const response = await firstValueFrom(
          this.httpService.get(
            `${this.baseUrl}/lists/${publicationId}/active.json`,
            {
              headers: {
                Authorization: this.getAuthHeader(apiKey),
              },
              params: {
                page,
                pagesize: pageSize,
                orderfield: 'email',
                orderdirection: 'asc',
              },
            }
          )
        );

        if (response.status === 200 && response.data) {
          const subscribers = response.data.Results || [];

          // Map Campaign Monitor subscriber data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = subscribers.map(
            (sub: any) => ({
              id: sub.EmailAddress || sub.email || '',
              email: sub.EmailAddress || sub.email || '',
              status: this.mapCampaignMonitorStatus(sub.State),
              firstName: sub.Name ? sub.Name.split(' ')[0] : null,
              lastName: sub.Name
                ? sub.Name.split(' ').slice(1).join(' ') || null
                : null,
              subscribedAt: sub.Date || null,
              unsubscribedAt: null,
              customFields: sub.CustomFields || [],
              ...sub,
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check pagination
          const totalPages =
            response.data.NumberOfPages || Math.ceil(response.data.TotalNumberOfRecords / pageSize) || 1;
          hasMore = page < totalPages && subscribers.length > 0;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Also fetch unsubscribed subscribers
      page = 1;
      hasMore = true;

      while (hasMore) {
        try {
          const response = await firstValueFrom(
            this.httpService.get(
              `${this.baseUrl}/lists/${publicationId}/unsubscribed.json`,
              {
                headers: {
                  Authorization: this.getAuthHeader(apiKey),
                },
                params: {
                  page,
                  pagesize: pageSize,
                  orderfield: 'email',
                  orderdirection: 'asc',
                },
              }
            )
          );

          if (response.status === 200 && response.data) {
            const subscribers = response.data.Results || [];

            const mappedSubscribers: SubscriberData[] = subscribers.map(
              (sub: any) => ({
                id: sub.EmailAddress || sub.email || '',
                email: sub.EmailAddress || sub.email || '',
                status: 'unsubscribed',
                firstName: sub.Name ? sub.Name.split(' ')[0] : null,
                lastName: sub.Name
                  ? sub.Name.split(' ').slice(1).join(' ') || null
                  : null,
                subscribedAt: sub.Date || null,
                unsubscribedAt: sub.Date || null,
                customFields: sub.CustomFields || [],
                ...sub,
              })
            );

            allSubscribers.push(...mappedSubscribers);

            const totalPages =
              response.data.NumberOfPages || Math.ceil(response.data.TotalNumberOfRecords / pageSize) || 1;
            hasMore = page < totalPages && subscribers.length > 0;
            page++;
          } else {
            hasMore = false;
          }
        } catch {
          // If unsubscribed endpoint fails, just continue
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
          throw new Error(`Campaign Monitor API server error: ${status}`);
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
   * Uses the list stats endpoint for efficiency
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
        this.httpService.get(`${this.baseUrl}/lists/${publicationId}/stats.json`, {
          headers: {
            Authorization: this.getAuthHeader(apiKey),
          },
        })
      );

      if (response.status === 200 && response.data) {
        // Campaign Monitor returns stats including TotalActiveSubscribers
        return (
          response.data.TotalActiveSubscribers ||
          response.data.TotalSubscribers ||
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
          throw new Error(`Campaign Monitor API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Campaign Monitor status values to our standard status format
   * @param cmStatus - The status (State) from Campaign Monitor API
   * @returns string - Mapped status value
   */
  private mapCampaignMonitorStatus(cmStatus: string): string {
    const statusMap: Record<string, string> = {
      Active: 'active',
      active: 'active',
      Unsubscribed: 'unsubscribed',
      unsubscribed: 'unsubscribed',
      Bounced: 'bounced',
      bounced: 'bounced',
      Deleted: 'unsubscribed',
      deleted: 'unsubscribed',
    };

    return statusMap[cmStatus] || cmStatus || 'active';
  }
}
