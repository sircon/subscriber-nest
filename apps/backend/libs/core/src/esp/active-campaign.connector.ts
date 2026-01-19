import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * ActiveCampaign ESP Connector
 * Implements the IEspConnector interface for ActiveCampaign API integration
 *
 * ActiveCampaign is a marketing automation platform with CRM and email marketing capabilities.
 * Authentication is done via API key in the Api-Token header.
 *
 * API Key format: "accountName|apiKey" where accountName is used to construct the base URL
 * Example: "mycompany|abc123xyz" results in base URL "https://mycompany.api-us1.com/api/3"
 *
 * API Documentation: https://developers.activecampaign.com/reference
 * API Version: v3 (current as of January 2026)
 */
@Injectable()
export class ActiveCampaignConnector implements IEspConnector {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Parses the API key to extract account name and actual API key
   * Format: "accountName|apiKey"
   * @param apiKey - The combined API key string
   * @returns Object with accountName and apiKey
   */
  private parseApiKey(apiKey: string): { accountName: string; apiKey: string } {
    const parts = apiKey.split('|');
    if (parts.length !== 2) {
      throw new Error(
        'Invalid API key format. Expected format: "accountName|apiKey"'
      );
    }
    return {
      accountName: parts[0].trim(),
      apiKey: parts[1].trim(),
    };
  }

  /**
   * Constructs the base URL for the ActiveCampaign API
   * @param accountName - The account name (subdomain)
   * @returns The base URL
   */
  private getBaseUrl(accountName: string): string {
    return `https://${accountName}.api-us1.com/api/3`;
  }

  /**
   * Gets the authorization headers for ActiveCampaign API requests
   * @param apiKey - The actual API key (not the combined string)
   * @returns Object with Api-Token header
   */
  private getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'Api-Token': apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validates an API key by making a test request to the ActiveCampaign API
   * @param apiKey - The API key to validate (format: "accountName|apiKey")
   * @param publicationId - Optional publication (list) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      const { accountName, apiKey: actualApiKey } = this.parseApiKey(apiKey);
      const baseUrl = this.getBaseUrl(accountName);

      // Use /lists endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/lists`, {
          headers: this.getAuthHeaders(actualApiKey),
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
              this.httpService.get(`${baseUrl}/lists/${publicationId}`, {
                headers: this.getAuthHeaders(actualApiKey),
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
      // Handle parsing errors
      if (error.message?.includes('Invalid API key format')) {
        console.error('ActiveCampaign API key format error:', error.message);
        return false;
      }

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
          `ActiveCampaign API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('ActiveCampaign API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (lists) available for the given API key
   * @param apiKey - The API key to use for authentication (format: "accountName|apiKey")
   * @returns Promise<Publication[]> - List of lists as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      const { accountName, apiKey: actualApiKey } = this.parseApiKey(apiKey);
      const baseUrl = this.getBaseUrl(accountName);

      const allLists: Publication[] = [];
      let offset = 0;
      const limit = 100; // ActiveCampaign default page size
      let hasMore = true;

      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(`${baseUrl}/lists`, {
            headers: this.getAuthHeaders(actualApiKey),
            params: {
              limit,
              offset,
            },
          })
        );

        if (response.status === 200 && response.data) {
          const lists = response.data.lists || [];

          const mappedLists: Publication[] = lists.map((list: any) => ({
            id: list.id,
            name: list.name || '',
            stringid: list.stringid || '',
            senderUrl: list.sender_url || '',
            senderReminder: list.sender_reminder || '',
            subscriberCount: parseInt(list.subscriber_count || '0', 10),
            ...list,
          }));

          allLists.push(...mappedLists);

          // Check if there are more lists to fetch
          hasMore = lists.length === limit;
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      return allLists;
    } catch (error: any) {
      if (error.message?.includes('Invalid API key format')) {
        throw new Error(error.message);
      }

      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`ActiveCampaign API server error: ${status}`);
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
   * @param apiKey - The API key to use for authentication (format: "accountName|apiKey")
   * @param publicationId - The list ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    try {
      const { accountName, apiKey: actualApiKey } = this.parseApiKey(apiKey);
      const baseUrl = this.getBaseUrl(accountName);

      const allSubscribers: SubscriberData[] = [];
      let offset = 0;
      const limit = 100; // ActiveCampaign default page size
      let hasMore = true;

      while (hasMore) {
        // Fetch contacts that belong to the specific list
        // ActiveCampaign uses contactLists to associate contacts with lists
        const response = await firstValueFrom(
          this.httpService.get(`${baseUrl}/contacts`, {
            headers: this.getAuthHeaders(actualApiKey),
            params: {
              listid: publicationId,
              limit,
              offset,
            },
          })
        );

        if (response.status === 200 && response.data) {
          const contacts = response.data.contacts || [];

          // Map ActiveCampaign contact data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = contacts.map(
            (contact: any) => ({
              id: contact.id,
              email: contact.email || '',
              status: this.mapActiveCampaignStatus(contact),
              firstName: contact.firstName || null,
              lastName: contact.lastName || null,
              subscribedAt: contact.cdate || contact.created_utc_timestamp || null,
              unsubscribedAt: contact.udate && contact.deleted !== '0' ? contact.udate : null,
              customFields: this.extractCustomFields(contact),
              phone: contact.phone || null,
              orgid: contact.orgid || null,
              ...contact,
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check if there are more contacts to fetch
          hasMore = contacts.length === limit;
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      return allSubscribers;
    } catch (error: any) {
      if (error.message?.includes('Invalid API key format')) {
        throw new Error(error.message);
      }

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
          throw new Error(`ActiveCampaign API server error: ${status}`);
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
   * Uses the list endpoint which returns subscriber_count
   * @param apiKey - The API key to use for authentication (format: "accountName|apiKey")
   * @param publicationId - The list ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const { accountName, apiKey: actualApiKey } = this.parseApiKey(apiKey);
      const baseUrl = this.getBaseUrl(accountName);

      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/lists/${publicationId}`, {
          headers: this.getAuthHeaders(actualApiKey),
        })
      );

      if (response.status === 200 && response.data) {
        const list = response.data.list || {};
        // ActiveCampaign returns subscriber_count in list details
        return parseInt(list.subscriber_count || '0', 10);
      }

      return 0;
    } catch (error: any) {
      if (error.message?.includes('Invalid API key format')) {
        throw new Error(error.message);
      }

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
          throw new Error(`ActiveCampaign API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps ActiveCampaign contact status to our standard status format
   * ActiveCampaign has several status indicators across different fields
   * @param contact - The contact object from ActiveCampaign API
   * @returns string - Mapped status value
   */
  private mapActiveCampaignStatus(contact: any): string {
    // Check if contact is deleted
    if (contact.deleted === '1') {
      return 'unsubscribed';
    }

    // ActiveCampaign status field: -1=any, 0=unconfirmed, 1=active, 2=unsubscribed, 3=bounced
    const status = parseInt(contact.status || '1', 10);

    switch (status) {
      case 0:
        return 'pending';
      case 1:
        return 'active';
      case 2:
        return 'unsubscribed';
      case 3:
        return 'bounced';
      default:
        return 'active';
    }
  }

  /**
   * Extracts custom fields from the contact object
   * ActiveCampaign stores custom fields in fieldValues array
   * @param contact - The contact object from ActiveCampaign API
   * @returns Object with custom field values
   */
  private extractCustomFields(contact: any): Record<string, any> {
    const customFields: Record<string, any> = {};

    // ActiveCampaign includes fieldValues array with custom field data
    if (contact.fieldValues && Array.isArray(contact.fieldValues)) {
      for (const field of contact.fieldValues) {
        if (field.field && field.value !== undefined) {
          customFields[field.field] = field.value;
        }
      }
    }

    return customFields;
  }
}
