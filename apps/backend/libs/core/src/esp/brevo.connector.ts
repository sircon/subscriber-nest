import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Brevo (formerly Sendinblue) ESP Connector
 * Implements the IEspConnector interface for Brevo API integration
 *
 * Brevo uses api-key header for authentication.
 *
 * API Documentation: https://developers.brevo.com/reference/getting-started-1
 * API Version: v3 (current as of January 2026)
 */
@Injectable()
export class BrevoConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.brevo.com/v3';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Gets the authorization headers for Brevo API requests
   * Brevo uses api-key header for authentication
   * @param apiKey - The API key
   * @returns Record<string, string> - Headers object with authorization
   */
  private getHeaders(apiKey: string): Record<string, string> {
    return {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Validates an API key by making a test request to the Brevo API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication (list) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      // Use /account endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/account`, {
          headers: this.getHeaders(apiKey),
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          try {
            const listResponse = await firstValueFrom(
              this.httpService.get(
                `${this.baseUrl}/contacts/lists/${publicationId}`,
                {
                  headers: this.getHeaders(apiKey),
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
        // 403 = Forbidden (valid key but no permission)
        if (status === 401 || status === 403) {
          return false;
        }
        // Other errors (429, 500, etc.) - log but return false
        console.error(
          `Brevo API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Brevo API validation error:', error.message);
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
      const allLists: Publication[] = [];
      let offset = 0;
      const limit = 50; // Brevo max limit per request

      // Paginate through all lists
      do {
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/contacts/lists`, {
            headers: this.getHeaders(apiKey),
            params: {
              limit,
              offset,
            },
          })
        );

        if (response.status === 200 && response.data) {
          const lists = response.data.lists || [];

          if (lists.length === 0) {
            break;
          }

          const mappedLists: Publication[] = lists.map((list: any) => ({
            id: String(list.id),
            name: list.name || '',
            folderId: list.folderId,
            totalBlacklisted: list.totalBlacklisted || 0,
            totalSubscribers: list.totalSubscribers || 0,
            uniqueSubscribers: list.uniqueSubscribers || 0,
            subscriberCount: list.uniqueSubscribers || list.totalSubscribers || 0,
            ...list,
          }));

          allLists.push(...mappedLists);

          // Check if there are more pages
          if (lists.length < limit) {
            break;
          }
          offset += limit;
        } else {
          break;
        }
      } while (true);

      return allLists;
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
          throw new Error(`Brevo API server error: ${status}`);
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

    try {
      let offset = 0;
      const limit = 500; // Brevo max limit per request for contacts

      // Paginate through all contacts in the list
      do {
        const response = await firstValueFrom(
          this.httpService.get(
            `${this.baseUrl}/contacts/lists/${publicationId}/contacts`,
            {
              headers: this.getHeaders(apiKey),
              params: {
                limit,
                offset,
              },
            }
          )
        );

        if (response.status === 200 && response.data) {
          const contacts = response.data.contacts || [];

          if (contacts.length === 0) {
            break;
          }

          for (const contact of contacts) {
            const subscriber: SubscriberData = {
              id: contact.id ? String(contact.id) : contact.email,
              email: contact.email || '',
              status: this.mapBrevoStatus(contact),
              firstName:
                contact.attributes?.FIRSTNAME ||
                contact.attributes?.firstName ||
                null,
              lastName:
                contact.attributes?.LASTNAME ||
                contact.attributes?.lastName ||
                null,
              subscribedAt: contact.createdAt || null,
              unsubscribedAt: contact.unsubscribedAt || null,
              customFields: contact.attributes || {},
              emailBlacklisted: contact.emailBlacklisted,
              smsBlacklisted: contact.smsBlacklisted,
              listIds: contact.listIds,
              modifiedAt: contact.modifiedAt,
              ...contact,
            };

            allSubscribers.push(subscriber);
          }

          // Check if there are more pages
          if (contacts.length < limit) {
            break;
          }
          offset += limit;
        } else {
          break;
        }
      } while (true);

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
          throw new Error(`Brevo API server error: ${status}`);
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
   * Uses the lists endpoint which includes subscriber count information
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The list ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      // Fetch the specific list by ID
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/contacts/lists/${publicationId}`,
          {
            headers: this.getHeaders(apiKey),
          }
        )
      );

      if (response.status === 200 && response.data) {
        // Return uniqueSubscribers (deduplicated) or totalSubscribers
        return response.data.uniqueSubscribers || response.data.totalSubscribers || 0;
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
          throw new Error(`Brevo API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Brevo contact status to our standard status format
   * @param contact - The contact object from Brevo API
   * @returns string - Mapped status value
   */
  private mapBrevoStatus(contact: any): string {
    // Check for blacklisted (unsubscribed) status
    if (contact.emailBlacklisted === true) {
      return 'unsubscribed';
    }

    // Check for hard bounce
    if (contact.hardBounced === true) {
      return 'bounced';
    }

    // Check for soft bounce (still tracked but problematic)
    if (contact.softBounced === true) {
      return 'soft_bounced';
    }

    // Check for spam complaint
    if (contact.spamReported === true) {
      return 'complained';
    }

    // Default to active
    return 'active';
  }
}
