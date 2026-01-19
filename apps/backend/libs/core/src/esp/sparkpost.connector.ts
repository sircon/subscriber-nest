import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * SparkPost ESP Connector
 * Implements the IEspConnector interface for SparkPost API integration
 *
 * SparkPost is primarily a transactional email service but supports recipient lists
 * for managing subscriber data. Authentication is done via API key in the Authorization header.
 *
 * API Documentation: https://developers.sparkpost.com/api/
 */
@Injectable()
export class SparkPostConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.sparkpost.com/api/v1';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Gets the authorization headers for SparkPost API requests
   * @param apiKey - The API key to use for authentication
   * @returns Object with Authorization header
   */
  private getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Determines the base URL based on API key format
   * SparkPost has US and EU endpoints
   * @param apiKey - The API key (may contain region indicator)
   * @returns The appropriate base URL
   */
  private getBaseUrl(apiKey: string): string {
    // If the API key indicates EU region or user provides eu| prefix
    if (apiKey.toLowerCase().startsWith('eu|')) {
      return 'https://api.eu.sparkpost.com/api/v1';
    }
    return this.baseUrl;
  }

  /**
   * Extracts the actual API key from the provided string
   * Handles region-prefixed keys (e.g., "eu|actual_api_key")
   * @param apiKey - The raw API key input
   * @returns The actual API key without region prefix
   */
  private extractApiKey(apiKey: string): string {
    if (apiKey.toLowerCase().startsWith('eu|')) {
      return apiKey.substring(3);
    }
    return apiKey;
  }

  /**
   * Validates an API key by making a test request to the SparkPost API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication (recipient list) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl(apiKey);
      const actualApiKey = this.extractApiKey(apiKey);

      // Use /account endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/account`, {
          headers: this.getAuthHeaders(actualApiKey),
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          try {
            const listResponse = await firstValueFrom(
              this.httpService.get(
                `${baseUrl}/recipient-lists/${publicationId}`,
                {
                  headers: this.getAuthHeaders(actualApiKey),
                  params: {
                    show_recipients: false, // Don't fetch recipients, just validate list exists
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
          `SparkPost API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('SparkPost API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (recipient lists) available for the given API key
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of recipient lists as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      const baseUrl = this.getBaseUrl(apiKey);
      const actualApiKey = this.extractApiKey(apiKey);

      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/recipient-lists`, {
          headers: this.getAuthHeaders(actualApiKey),
        })
      );

      if (response.status === 200 && response.data) {
        const lists = response.data.results || [];

        const mappedLists: Publication[] = lists.map((list: any) => ({
          id: list.id,
          name: list.name || list.id || '',
          description: list.description || '',
          totalAcceptedRecipients: list.total_accepted_recipients || 0,
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
          throw new Error(`SparkPost API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers (recipients) for a specific recipient list
   * Note: SparkPost returns all recipients in a single request for a list
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The recipient list ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    try {
      const baseUrl = this.getBaseUrl(apiKey);
      const actualApiKey = this.extractApiKey(apiKey);

      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/recipient-lists/${publicationId}`, {
          headers: this.getAuthHeaders(actualApiKey),
          params: {
            show_recipients: true, // Include recipients in response
          },
        })
      );

      if (response.status === 200 && response.data) {
        const result = response.data.results || {};
        const recipients = result.recipients || [];

        // Map SparkPost recipient data to our SubscriberData interface
        const mappedSubscribers: SubscriberData[] = recipients.map(
          (recipient: any) => {
            const address = recipient.address || {};

            return {
              id: address.email || recipient.email || '',
              email: address.email || recipient.email || '',
              status: this.mapSparkPostStatus(recipient),
              firstName: address.name
                ? this.extractFirstName(address.name)
                : null,
              lastName: address.name
                ? this.extractLastName(address.name)
                : null,
              subscribedAt: recipient.created_at || null,
              unsubscribedAt: null, // SparkPost doesn't track unsubscribe date in recipient lists
              customFields: recipient.substitution_data || {},
              tags: recipient.tags || [],
              metadata: recipient.metadata || {},
              ...recipient,
            };
          }
        );

        return mappedSubscribers;
      }

      return [];
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Recipient list not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`SparkPost API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Gets the total subscriber count for a specific recipient list
   * Uses the recipient list endpoint with show_recipients=false for efficiency
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The recipient list ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const baseUrl = this.getBaseUrl(apiKey);
      const actualApiKey = this.extractApiKey(apiKey);

      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/recipient-lists/${publicationId}`, {
          headers: this.getAuthHeaders(actualApiKey),
          params: {
            show_recipients: false, // Don't fetch recipients, just metadata
          },
        })
      );

      if (response.status === 200 && response.data) {
        const result = response.data.results || {};
        // SparkPost returns total_accepted_recipients in the list metadata
        return (
          result.total_accepted_recipients || result.recipient_count || 0
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
          throw new Error(`Recipient list not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`SparkPost API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps SparkPost recipient status to our standard status format
   * SparkPost doesn't have a direct status field, so we infer from metadata
   * @param recipient - The recipient object from SparkPost API
   * @returns string - Mapped status value
   */
  private mapSparkPostStatus(recipient: any): string {
    // SparkPost recipients in a list are generally considered active
    // Check for suppression or metadata indicators
    if (recipient.suppressed) {
      return 'unsubscribed';
    }
    if (recipient.metadata?.unsubscribed) {
      return 'unsubscribed';
    }
    if (recipient.metadata?.bounced) {
      return 'bounced';
    }
    if (recipient.return_path?.hard_bounce) {
      return 'bounced';
    }

    // Default to active for valid recipients
    return 'active';
  }

  /**
   * Extracts the first name from a full name string
   * @param fullName - The full name to parse
   * @returns The first name or null
   */
  private extractFirstName(fullName: string): string | null {
    if (!fullName) return null;
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || null;
  }

  /**
   * Extracts the last name from a full name string
   * @param fullName - The full name to parse
   * @returns The last name or null
   */
  private extractLastName(fullName: string): string | null {
    if (!fullName) return null;
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : null;
  }
}
