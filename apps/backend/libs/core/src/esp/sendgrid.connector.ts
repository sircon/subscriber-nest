import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * SendGrid ESP Connector
 * Implements the IEspConnector interface for SendGrid API integration
 *
 * SendGrid uses Bearer token authentication with API keys.
 *
 * API Documentation: https://docs.sendgrid.com/api-reference/marketing-campaigns/
 * API Version: v3 (current as of January 2026)
 */
@Injectable()
export class SendGridConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.sendgrid.com/v3';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Gets the authorization headers for SendGrid API requests
   * SendGrid uses Bearer token authentication
   * @param apiKey - The API key
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
   * Validates an API key by making a test request to the SendGrid API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication (list) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      // Use /marketing/lists endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/marketing/lists`, {
          headers: this.getHeaders(apiKey),
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          const lists = response.data.result || [];
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
          `SendGrid API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('SendGrid API validation error:', error.message);
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
      let pageToken: string | undefined;

      // Paginate through all lists
      do {
        const params: Record<string, any> = {
          page_size: 100,
        };
        if (pageToken) {
          params.page_token = pageToken;
        }

        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/marketing/lists`, {
            headers: this.getHeaders(apiKey),
            params,
          })
        );

        if (response.status === 200 && response.data) {
          const lists = response.data.result || [];

          const mappedLists: Publication[] = lists.map((list: any) => ({
            id: String(list.id),
            name: list.name || '',
            contactCount: list.contact_count || 0,
            subscriberCount: list.contact_count || 0,
            ...list,
          }));

          allLists.push(...mappedLists);

          // Get next page token from metadata
          pageToken = response.data._metadata?.next;
        } else {
          break;
        }
      } while (pageToken);

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
          throw new Error(`SendGrid API server error: ${status}`);
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
   * SendGrid uses a search endpoint to get contacts by list
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
      // First, initiate a contacts export for the specific list
      // SendGrid uses the search endpoint to query contacts by list
      const searchQuery = {
        query: `CONTAINS(list_ids, '${publicationId}')`,
      };

      let pageToken: string | undefined;

      // Use the search endpoint with pagination
      do {
        const response = await firstValueFrom(
          this.httpService.post(
            `${this.baseUrl}/marketing/contacts/search`,
            {
              ...searchQuery,
              ...(pageToken ? { page_token: pageToken } : {}),
            },
            {
              headers: this.getHeaders(apiKey),
            }
          )
        );

        if (response.status === 200 && response.data) {
          const contacts = response.data.result || [];

          for (const contact of contacts) {
            const subscriber: SubscriberData = {
              id: contact.id || contact.email,
              email: contact.email || '',
              status: this.mapSendGridStatus(contact),
              firstName: contact.first_name || null,
              lastName: contact.last_name || null,
              subscribedAt: contact.created_at || null,
              unsubscribedAt: contact.unsubscribed_at || null,
              customFields: contact.custom_fields || {},
              city: contact.city,
              state: contact.state_province_region,
              country: contact.country,
              postalCode: contact.postal_code,
              phoneNumber: contact.phone_number,
              alternateEmails: contact.alternate_emails,
              ...contact,
            };

            allSubscribers.push(subscriber);
          }

          // Get next page token
          pageToken = response.data._metadata?.next;
        } else {
          break;
        }
      } while (pageToken);

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
          throw new Error(`SendGrid API server error: ${status}`);
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
   * Uses the lists endpoint which includes contact_count information
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
          `${this.baseUrl}/marketing/lists/${publicationId}`,
          {
            headers: this.getHeaders(apiKey),
          }
        )
      );

      if (response.status === 200 && response.data) {
        return response.data.contact_count || 0;
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
          throw new Error(`SendGrid API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps SendGrid contact status to our standard status format
   * @param contact - The contact object from SendGrid API
   * @returns string - Mapped status value
   */
  private mapSendGridStatus(contact: any): string {
    // Check for unsubscribed status
    if (contact.unsubscribed_at) {
      return 'unsubscribed';
    }

    // Check for bounced emails
    if (contact.email_status === 'bounced' || contact.is_bounced === true) {
      return 'bounced';
    }

    // Check for invalid email
    if (contact.email_status === 'invalid') {
      return 'invalid';
    }

    // Check for spam report
    if (contact.email_status === 'spam_reported' || contact.is_spam === true) {
      return 'complained';
    }

    // Check for pending confirmation
    if (contact.email_status === 'pending') {
      return 'pending';
    }

    // Default to active
    return 'active';
  }
}
