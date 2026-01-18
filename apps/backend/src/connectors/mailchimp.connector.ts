import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from '../interfaces/esp-connector.interface';
import { Publication, SubscriberData } from '../interfaces/esp.interface';

/**
 * Mailchimp ESP Connector
 * Implements the IEspConnector interface for Mailchimp API integration using OAuth authentication
 */
@Injectable()
export class MailchimpConnector implements IEspConnector {
  private readonly metadataUrl = 'https://login.mailchimp.com/oauth2/metadata';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Gets the Mailchimp datacenter code (dc) from the metadata endpoint
   * @param accessToken - The OAuth access token
   * @returns Promise<string> - The datacenter code (e.g., 'us1', 'us2', 'eu1')
   */
  private async getDatacenterCode(accessToken: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ dc: string }>(this.metadataUrl, {
          headers: {
            Authorization: `OAuth ${accessToken}`,
          },
        })
      );

      if (response.status === 200 && response.data?.dc) {
        return response.data.dc;
      }

      throw new Error(
        'Failed to retrieve datacenter code from Mailchimp metadata'
      );
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid access token: ${status}`);
        }
        throw new Error(`Failed to get datacenter code: ${status}`);
      }
      throw new Error(
        `Network error while getting datacenter code: ${error.message}`
      );
    }
  }

  /**
   * Gets the base URL for Mailchimp API based on datacenter code
   * @param accessToken - The OAuth access token
   * @returns Promise<string> - The base URL (e.g., 'https://us1.api.mailchimp.com/3.0')
   */
  private async getBaseUrl(accessToken: string): Promise<string> {
    const dc = await this.getDatacenterCode(accessToken);
    return `https://${dc}.api.mailchimp.com/3.0`;
  }

  /**
   * Validates an API key by making a test request to the Mailchimp API
   * Note: Mailchimp uses OAuth, so this method is not used but required by interface
   * @param apiKey - The API key to validate (not used for Mailchimp)
   * @param publicationId - Optional publication ID to validate against
   * @returns Promise<boolean> - Always returns false as Mailchimp doesn't use API keys
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    // Mailchimp doesn't support API key authentication, only OAuth
    return false;
  }

  /**
   * Fetches all publications available for the given API key
   * Note: Mailchimp uses OAuth, so this method is not used but required by interface
   * @param apiKey - The API key to use for authentication (not used for Mailchimp)
   * @returns Promise<Publication[]> - Always returns empty array
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    // Mailchimp doesn't support API key authentication, only OAuth
    return [];
  }

  /**
   * Fetches all subscribers for a specific publication
   * Note: Mailchimp uses OAuth, so this method is not used but required by interface
   * @param apiKey - The API key to use for authentication (not used for Mailchimp)
   * @param publicationId - The publication ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - Always returns empty array
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    // Mailchimp doesn't support API key authentication, only OAuth
    return [];
  }

  /**
   * Gets the total subscriber count for a specific publication
   * Note: Mailchimp uses OAuth, so this method is not used but required by interface
   * @param apiKey - The API key to use for authentication (not used for Mailchimp)
   * @param publicationId - The publication ID to get subscriber count for
   * @returns Promise<number> - Always returns 0
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    // Mailchimp doesn't support API key authentication, only OAuth
    return 0;
  }

  /**
   * Validates an OAuth access token by making a test request to the Mailchimp API
   * @param accessToken - The OAuth access token to validate
   * @returns Promise<boolean> - true if access token is valid, false otherwise
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      // Get base URL using datacenter code
      const baseUrl = await this.getBaseUrl(accessToken);

      // Make a lightweight API call to validate the token
      // Using /lists endpoint as it's a common endpoint that requires authentication
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/lists`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            count: 1, // Only fetch 1 list to minimize data transfer
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
          `Mailchimp API error during token validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Mailchimp API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all lists (publications) available for the given OAuth access token
   * @param accessToken - The OAuth access token to use for authentication
   * @returns Promise<Publication[]> - List of publications (lists)
   */
  async fetchPublicationsWithOAuth(
    accessToken: string
  ): Promise<Publication[]> {
    try {
      // Get base URL using datacenter code
      const baseUrl = await this.getBaseUrl(accessToken);

      const allLists: Publication[] = [];
      let offset = 0;
      const count = 1000; // Mailchimp allows up to 1000 items per request
      let hasMore = true;

      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(`${baseUrl}/lists`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              count,
              offset,
            },
          })
        );

        if (response.status === 200 && response.data) {
          // Mailchimp API returns lists in response.data.lists array
          const lists = response.data.lists || [];

          // Map Mailchimp list data to our Publication interface
          const mappedLists: Publication[] = lists.map((list: any) => ({
            id: list.id || '',
            name: list.name || '',
            ...list, // Include all other Mailchimp-specific fields
          }));

          allLists.push(...mappedLists);

          // Check if there are more lists to fetch
          // Mailchimp returns total_items in response
          const totalItems = response.data.total_items || 0;
          const currentItems = allLists.length;

          // If we've fetched all items, we're done
          hasMore = currentItems < totalItems;
          offset += lists.length;
        } else {
          hasMore = false;
        }
      }

      return allLists;
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
          throw new Error(`Mailchimp API server error: ${status}`);
        }
        throw new Error(`Failed to fetch lists: ${status}`);
      }
      throw new Error(`Network error while fetching lists: ${error.message}`);
    }
  }

  /**
   * Fetches all members (subscribers) for a specific list with pagination support
   * @param accessToken - The OAuth access token to use for authentication
   * @param publicationId - The list ID to fetch members for
   * @returns Promise<SubscriberData[]> - List of subscribers (members)
   */
  async fetchSubscribersWithOAuth(
    accessToken: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    try {
      // Get base URL using datacenter code
      const baseUrl = await this.getBaseUrl(accessToken);

      const allMembers: SubscriberData[] = [];
      let offset = 0;
      const count = 1000; // Mailchimp allows up to 1000 items per request
      let hasMore = true;

      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(`${baseUrl}/lists/${publicationId}/members`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              count,
              offset,
            },
          })
        );

        if (response.status === 200 && response.data) {
          // Mailchimp API returns members in response.data.members array
          const members = response.data.members || [];

          // Map Mailchimp member data to our SubscriberData interface
          const mappedMembers: SubscriberData[] = members.map(
            (member: any) => ({
              id: member.id || '',
              email: member.email_address || member.email || '',
              status: this.mapMailchimpStatus(member.status),
              firstName:
                member.merge_fields?.FNAME ||
                member.merge_fields?.fname ||
                member.first_name ||
                null,
              lastName:
                member.merge_fields?.LNAME ||
                member.merge_fields?.lname ||
                member.last_name ||
                null,
              subscribedAt:
                member.timestamp_signup ||
                member.timestamp_opt ||
                member.created_at ||
                null,
              unsubscribedAt:
                member.timestamp_opt || member.unsubscribed_at || null,
              ...member, // Include all other Mailchimp-specific fields
            })
          );

          allMembers.push(...mappedMembers);

          // Check if there are more members to fetch
          // Mailchimp returns total_items in response
          const totalItems = response.data.total_items || 0;
          const currentItems = allMembers.length;

          // If we've fetched all items, we're done
          hasMore = currentItems < totalItems;
          offset += members.length;
        } else {
          hasMore = false;
        }
      }

      return allMembers;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid access token: ${status}`);
        }
        if (status === 404) {
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Mailchimp API server error: ${status}`);
        }
        throw new Error(`Failed to fetch members: ${status}`);
      }
      throw new Error(`Network error while fetching members: ${error.message}`);
    }
  }

  /**
   * Gets the total member count for a specific list
   * This is a lightweight method that only fetches the first page to get the total count
   * @param accessToken - The OAuth access token to use for authentication
   * @param publicationId - The list ID to get member count for
   * @returns Promise<number> - Total number of members
   */
  async getSubscriberCountWithOAuth(
    accessToken: string,
    publicationId: string
  ): Promise<number> {
    try {
      // Get base URL using datacenter code
      const baseUrl = await this.getBaseUrl(accessToken);

      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/lists/${publicationId}/members`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            count: 1, // Only fetch 1 member to get the total count from metadata
            offset: 0,
          },
        })
      );

      if (response.status === 200 && response.data) {
        // Mailchimp API returns total_items in response
        return response.data.total_items || 0;
      }

      return 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid access token: ${status}`);
        }
        if (status === 404) {
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Mailchimp API server error: ${status}`);
        }
        throw new Error(`Failed to fetch member count: ${status}`);
      }
      throw new Error(
        `Network error while fetching member count: ${error.message}`
      );
    }
  }

  /**
   * Maps Mailchimp status values to our standard status format
   * Mailchimp statuses: subscribed, unsubscribed, cleaned, pending, transactional
   * @param mailchimpStatus - The status from Mailchimp API
   * @returns string - Mapped status value
   */
  private mapMailchimpStatus(mailchimpStatus: string): string {
    const statusMap: Record<string, string> = {
      subscribed: 'active',
      unsubscribed: 'unsubscribed',
      cleaned: 'bounced',
      pending: 'active',
      transactional: 'active',
    };

    const normalized = (mailchimpStatus || '').toLowerCase();
    return statusMap[normalized] || mailchimpStatus || 'active';
  }
}
