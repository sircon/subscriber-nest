import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Customer.io ESP Connector
 * Implements the IEspConnector interface for Customer.io API integration
 *
 * Customer.io is a messaging platform for marketing, product, and transactional messaging.
 * Authentication is done via Bearer token with the App API key.
 *
 * API Key format: Plain App API key (from Customer.io Settings > Account Settings > API Credentials)
 * For regional EU data centers, use "eu|apiKey" format.
 *
 * API Documentation: https://customer.io/docs/api/
 * - App API (api.customer.io): For accessing workspace data (segments, customers)
 * - Track API (track.customer.io): For tracking events and customer data
 *
 * This connector uses the App API for listing segments and customers.
 */
@Injectable()
export class CustomerIoConnector implements IEspConnector {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Parses the API key to extract region and actual API key
   * Format: "apiKey" (US) or "eu|apiKey" (EU)
   * @param apiKey - The API key string
   * @returns Object with region and apiKey
   */
  private parseApiKey(apiKey: string): { region: 'us' | 'eu'; apiKey: string } {
    if (apiKey.startsWith('eu|')) {
      return {
        region: 'eu',
        apiKey: apiKey.slice(3).trim(),
      };
    }
    return {
      region: 'us',
      apiKey: apiKey.trim(),
    };
  }

  /**
   * Constructs the base URL for the Customer.io App API
   * @param region - The data center region ('us' or 'eu')
   * @returns The base URL
   */
  private getBaseUrl(region: 'us' | 'eu'): string {
    if (region === 'eu') {
      return 'https://api-eu.customer.io/v1';
    }
    return 'https://api.customer.io/v1';
  }

  /**
   * Gets the authorization headers for Customer.io API requests
   * @param apiKey - The App API key
   * @returns Object with Authorization header
   */
  private getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validates an API key by making a test request to the Customer.io API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication (segment) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      const { region, apiKey: actualApiKey } = this.parseApiKey(apiKey);
      const baseUrl = this.getBaseUrl(region);

      // Use /segments endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/segments`, {
          headers: this.getAuthHeaders(actualApiKey),
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          try {
            const segmentResponse = await firstValueFrom(
              this.httpService.get(`${baseUrl}/segments/${publicationId}`, {
                headers: this.getAuthHeaders(actualApiKey),
              })
            );
            return segmentResponse.status === 200;
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
          `Customer.io API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Customer.io API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (segments) available for the given API key
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of segments as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      const { region, apiKey: actualApiKey } = this.parseApiKey(apiKey);
      const baseUrl = this.getBaseUrl(region);

      const allSegments: Publication[] = [];

      // Customer.io segments endpoint returns all segments
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/segments`, {
          headers: this.getAuthHeaders(actualApiKey),
        })
      );

      if (response.status === 200 && response.data) {
        const segments = response.data.segments || [];

        const mappedSegments: Publication[] = segments.map((segment: any) => ({
          id: String(segment.id),
          name: segment.name || '',
          description: segment.description || '',
          state: segment.state || '',
          progress: segment.progress || 0,
          type: segment.type || '',
          deduplicate_id: segment.deduplicate_id || '',
          ...segment,
        }));

        allSegments.push(...mappedSegments);
      }

      return allSegments;
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
          throw new Error(`Customer.io API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers (customers) for a specific segment
   * Uses the segment membership endpoint to get customers in a segment
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The segment ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    try {
      const { region, apiKey: actualApiKey } = this.parseApiKey(apiKey);
      const baseUrl = this.getBaseUrl(region);

      const allSubscribers: SubscriberData[] = [];
      let nextCursor: string | null = null;
      const limit = 100; // Customer.io default page size

      do {
        // Fetch customers that belong to the specific segment
        // Customer.io uses /segments/{segment_id}/membership endpoint
        const params: Record<string, any> = { limit };
        if (nextCursor) {
          params.start = nextCursor;
        }

        const response = await firstValueFrom(
          this.httpService.get(
            `${baseUrl}/segments/${publicationId}/membership`,
            {
              headers: this.getAuthHeaders(actualApiKey),
              params,
            }
          )
        );

        if (response.status === 200 && response.data) {
          const customers = response.data.ids || [];
          nextCursor = response.data.next || null;

          // Customer.io membership returns only IDs, need to fetch full profiles
          // Batch fetch customer profiles
          for (const customerId of customers) {
            try {
              const customerProfile = await this.fetchCustomerProfile(
                actualApiKey,
                baseUrl,
                String(customerId)
              );
              if (customerProfile) {
                allSubscribers.push(customerProfile);
              }
            } catch (profileError: any) {
              // Log error but continue with other customers
              console.error(
                `Failed to fetch profile for customer ${customerId}:`,
                profileError.message
              );
            }
          }
        } else {
          nextCursor = null;
        }
      } while (nextCursor);

      return allSubscribers;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Segment not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Customer.io API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Fetches a single customer profile from Customer.io
   * @param apiKey - The API key for authentication
   * @param baseUrl - The base URL for the API
   * @param customerId - The customer ID to fetch
   * @returns Promise<SubscriberData | null> - Customer data or null if not found
   */
  private async fetchCustomerProfile(
    apiKey: string,
    baseUrl: string,
    customerId: string
  ): Promise<SubscriberData | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/customers/${customerId}/attributes`, {
          headers: this.getAuthHeaders(apiKey),
        })
      );

      if (response.status === 200 && response.data) {
        const customer = response.data.customer || response.data;

        return {
          id: customerId,
          email: customer.email || '',
          status: this.mapCustomerIoStatus(customer),
          firstName: customer.first_name || customer.firstName || null,
          lastName: customer.last_name || customer.lastName || null,
          subscribedAt: customer.created_at
            ? new Date(customer.created_at * 1000).toISOString()
            : null,
          unsubscribedAt: customer.unsubscribed_at
            ? new Date(customer.unsubscribed_at * 1000).toISOString()
            : null,
          customFields: this.extractCustomFields(customer),
          ...customer,
        };
      }

      return null;
    } catch (error: any) {
      // Return null for 404 errors (customer not found)
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Gets the total subscriber count for a specific segment
   * Uses the segment details endpoint which includes customer count
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The segment ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const { region, apiKey: actualApiKey } = this.parseApiKey(apiKey);
      const baseUrl = this.getBaseUrl(region);

      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/segments/${publicationId}`, {
          headers: this.getAuthHeaders(actualApiKey),
        })
      );

      if (response.status === 200 && response.data) {
        const segment = response.data.segment || response.data;
        // Customer.io returns count in segment details
        return segment.count || segment.customer_count || 0;
      }

      return 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Segment not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Customer.io API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Customer.io customer status to our standard status format
   * Customer.io uses unsubscribed flag and other attributes
   * @param customer - The customer object from Customer.io API
   * @returns string - Mapped status value
   */
  private mapCustomerIoStatus(customer: any): string {
    // Check if customer is unsubscribed
    if (customer.unsubscribed === true || customer.unsubscribed === 'true') {
      return 'unsubscribed';
    }

    // Check if customer email is suppressed/bounced
    if (customer.email_bounced === true || customer.email_bounced === 'true') {
      return 'bounced';
    }

    // Check for pending status
    if (customer.email_pending === true || customer.email_pending === 'true') {
      return 'pending';
    }

    // Default to active
    return 'active';
  }

  /**
   * Extracts custom fields from the customer object
   * Customer.io stores all attributes in a flat structure
   * @param customer - The customer object from Customer.io API
   * @returns Object with custom field values
   */
  private extractCustomFields(customer: any): Record<string, any> {
    const customFields: Record<string, any> = {};
    const excludedFields = new Set([
      'id',
      'email',
      'unsubscribed',
      'email_bounced',
      'email_pending',
      'first_name',
      'firstName',
      'last_name',
      'lastName',
      'created_at',
      'unsubscribed_at',
      '_cio_subscription_preferences',
    ]);

    // Copy all non-standard fields as custom fields
    for (const [key, value] of Object.entries(customer)) {
      if (!excludedFields.has(key) && value !== undefined && value !== null) {
        customFields[key] = value;
      }
    }

    return customFields;
  }
}
