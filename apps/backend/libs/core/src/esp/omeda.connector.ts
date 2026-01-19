import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Omeda ESP Connector
 * Implements the IEspConnector interface for Omeda API integration
 *
 * Omeda is an audience development platform for media companies.
 * It uses API key authentication via the x-omeda-appid header.
 * API keys are formatted as "client:appid:inputid" where client is the brand identifier.
 *
 * API Documentation: https://developer.omeda.com/
 * API Version: Current REST API (no versioning in URL, current as of January 2026)
 */
@Injectable()
export class OmedaConnector implements IEspConnector {
  // Base URL template - {client} is replaced with the brand identifier from API key
  private readonly baseUrlTemplate = 'https://ows.omeda.com/webservices/rest';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Parses the Omeda API key to extract client, appId, and inputId
   * Format: "client:appid:inputid" (e.g., "mybrand:abc123:xyz789")
   * @param apiKey - The combined API key string
   * @returns Parsed key components
   */
  private parseApiKey(apiKey: string): {
    client: string;
    appId: string;
    inputId: string;
  } {
    const parts = apiKey.split(':');
    if (parts.length < 3) {
      // If not in the expected format, treat the whole key as appId
      // and require client to be specified separately
      return {
        client: parts[0] || '',
        appId: parts[1] || apiKey,
        inputId: parts[2] || '',
      };
    }
    return {
      client: parts[0],
      appId: parts[1],
      inputId: parts[2],
    };
  }

  /**
   * Gets the base URL for the Omeda API
   * @param client - The Omeda client/brand identifier
   * @returns The base URL for API calls
   */
  private getBaseUrl(client: string): string {
    return `${this.baseUrlTemplate}/${client}`;
  }

  /**
   * Gets the authentication headers for Omeda API calls
   * @param appId - The Omeda app ID
   * @param inputId - The Omeda input ID (optional)
   * @returns Headers object for API requests
   */
  private getAuthHeaders(
    appId: string,
    inputId?: string
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'x-omeda-appid': appId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (inputId) {
      headers['x-omeda-inputid'] = inputId;
    }

    return headers;
  }

  /**
   * Validates an API key by making a test request to the Omeda API
   * @param apiKey - The API key to validate (format: client:appid:inputid)
   * @param publicationId - Optional publication (product) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      const { client, appId, inputId } = this.parseApiKey(apiKey);

      if (!client || !appId) {
        return false;
      }

      // Use /brand endpoint to validate API key
      const response = await firstValueFrom(
        this.httpService.get(`${this.getBaseUrl(client)}/brand/*`, {
          headers: this.getAuthHeaders(appId, inputId),
        })
      );

      // If status is 200, the API key is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          try {
            const productResponse = await firstValueFrom(
              this.httpService.get(
                `${this.getBaseUrl(client)}/product/${publicationId}/*`,
                {
                  headers: this.getAuthHeaders(appId, inputId),
                }
              )
            );
            return productResponse.status === 200;
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
          `Omeda API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Omeda API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (products/newsletters) available for the given API key
   * @param apiKey - The API key to use for authentication (format: client:appid:inputid)
   * @returns Promise<Publication[]> - List of products as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      const { client, appId, inputId } = this.parseApiKey(apiKey);

      if (!client || !appId) {
        throw new Error('Invalid API key format. Expected: client:appid:inputid');
      }

      // Fetch all products (newsletters/publications)
      const response = await firstValueFrom(
        this.httpService.get(`${this.getBaseUrl(client)}/products/*`, {
          headers: this.getAuthHeaders(appId, inputId),
        })
      );

      if (response.status !== 200 || !response.data) {
        return [];
      }

      // Omeda returns products in the response
      const products = response.data.Products || response.data.products || [];

      const mappedPublications: Publication[] = products.map((product: any) => ({
        id: String(product.ProductId || product.Id || product.id),
        name: product.ProductName || product.Name || product.name || '',
        description: product.Description || product.description || '',
        productType: product.ProductType || product.productType,
        deploymentTypeId: product.DeploymentTypeId,
        ...product,
      }));

      return mappedPublications;
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
          throw new Error(`Omeda API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers for a specific product with pagination support
   * @param apiKey - The API key to use for authentication (format: client:appid:inputid)
   * @param publicationId - The product ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];
    let offset = 0;
    let hasMore = true;
    const limit = 500; // Omeda supports up to 500 records per query

    try {
      const { client, appId, inputId } = this.parseApiKey(apiKey);

      if (!client || !appId) {
        throw new Error('Invalid API key format. Expected: client:appid:inputid');
      }

      while (hasMore) {
        // Use audience query to fetch subscribers for the product
        const queryPayload = {
          ProductIds: [parseInt(publicationId, 10)],
          OutputFields: [
            'Email',
            'FirstName',
            'LastName',
            'CustomerId',
            'EmailStatus',
            'CreateDate',
            'ChangeDate',
          ],
          Pagination: {
            Offset: offset,
            Limit: limit,
          },
        };

        const response = await firstValueFrom(
          this.httpService.post(
            `${this.getBaseUrl(client)}/audience/query/*`,
            queryPayload,
            {
              headers: this.getAuthHeaders(appId, inputId),
            }
          )
        );

        if (response.status === 200 && response.data) {
          const customers =
            response.data.Customers ||
            response.data.customers ||
            response.data.Records ||
            [];

          // Map Omeda customer data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = customers.map(
            (customer: any) => ({
              id: String(customer.CustomerId || customer.Id || customer.id || customer.Email),
              email: customer.Email || customer.email || customer.EmailAddress || '',
              status: this.mapOmedaStatus(customer.EmailStatus || customer.Status),
              firstName: customer.FirstName || customer.firstName || null,
              lastName: customer.LastName || customer.lastName || null,
              subscribedAt: customer.CreateDate || customer.createDate || null,
              unsubscribedAt:
                customer.EmailStatus === 'O' || customer.EmailStatus === 'U'
                  ? customer.ChangeDate || null
                  : null,
              customerId: customer.CustomerId,
              ...customer,
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check pagination
          const totalCount =
            response.data.TotalCount ||
            response.data.totalCount ||
            response.data.Total ||
            0;
          hasMore = customers.length === limit && offset + limit < totalCount;
          offset += limit;
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
          throw new Error(`Product not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Omeda API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Gets the total subscriber count for a specific product
   * @param apiKey - The API key to use for authentication (format: client:appid:inputid)
   * @param publicationId - The product ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const { client, appId, inputId } = this.parseApiKey(apiKey);

      if (!client || !appId) {
        throw new Error('Invalid API key format. Expected: client:appid:inputid');
      }

      // Use audience query with count only to get subscriber count
      const queryPayload = {
        ProductIds: [parseInt(publicationId, 10)],
        CountOnly: true,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.getBaseUrl(client)}/audience/query/*`,
          queryPayload,
          {
            headers: this.getAuthHeaders(appId, inputId),
          }
        )
      );

      if (response.status === 200 && response.data) {
        return (
          response.data.TotalCount ||
          response.data.totalCount ||
          response.data.Count ||
          response.data.count ||
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
          throw new Error(`Product not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Omeda API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Omeda email status values to our standard status format
   * Omeda uses single-letter codes: A=Active, O=Opt-out, U=Unsubscribed, B=Bounced
   * @param omedaStatus - The status from Omeda API
   * @returns string - Mapped status value
   */
  private mapOmedaStatus(omedaStatus: string): string {
    const statusMap: Record<string, string> = {
      A: 'active',
      Active: 'active',
      active: 'active',
      O: 'unsubscribed',
      'Opt-out': 'unsubscribed',
      optout: 'unsubscribed',
      U: 'unsubscribed',
      Unsubscribed: 'unsubscribed',
      unsubscribed: 'unsubscribed',
      B: 'bounced',
      Bounced: 'bounced',
      bounced: 'bounced',
      I: 'inactive',
      Inactive: 'inactive',
      inactive: 'inactive',
    };

    return statusMap[omedaStatus] || omedaStatus || 'active';
  }
}
