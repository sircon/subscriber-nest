import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Constant Contact ESP Connector
 * Implements the IEspConnector interface for Constant Contact API integration
 *
 * Constant Contact uses OAuth 2.0 with Bearer token authentication.
 * The API key is the access token (obtained via OAuth flow).
 *
 * API Documentation: https://developer.constantcontact.com/api_guide/index.html
 * API Reference: https://developer.constantcontact.com/api_reference/index.html
 * API Version: v3 (current as of January 2026)
 */
@Injectable()
export class ConstantContactConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.cc.email/v3';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Gets the authorization headers for Constant Contact API requests
   * Constant Contact uses Bearer token authentication
   * @param apiKey - The OAuth access token
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
   * Validates an API key (access token) by making a test request to the Constant Contact API
   * @param apiKey - The access token to validate
   * @param publicationId - Optional publication (contact list) ID to validate against
   * @returns Promise<boolean> - true if access token is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      // Use /account/summary endpoint to validate access token
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/account/summary`, {
          headers: this.getHeaders(apiKey),
        })
      );

      // If status is 200, the access token is valid
      if (response.status === 200) {
        // If publicationId is provided, verify it exists
        if (publicationId) {
          try {
            const listResponse = await firstValueFrom(
              this.httpService.get(
                `${this.baseUrl}/contact_lists/${publicationId}`,
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
        // 401 = Unauthorized (invalid or expired token)
        // 403 = Forbidden (valid token but no permission)
        if (status === 401 || status === 403) {
          return false;
        }
        // Other errors (429, 500, etc.) - log but return false
        console.error(
          `Constant Contact API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Constant Contact API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (contact lists) available for the given access token
   * @param apiKey - The access token to use for authentication
   * @returns Promise<Publication[]> - List of contact lists as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    const allPublications: Publication[] = [];
    let cursor: string | null = null;
    const limit = 50; // Constant Contact max limit per request

    try {
      do {
        const params: Record<string, any> = {
          limit,
          include_count: true,
          include_membership_count: 'all',
        };
        if (cursor) {
          params.cursor = cursor;
        }

        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/contact_lists`, {
            headers: this.getHeaders(apiKey),
            params,
          })
        );

        if (response.status === 200 && response.data) {
          const lists = response.data.lists || [];

          const mappedLists: Publication[] = lists.map((list: any) => ({
            id: list.list_id,
            name: list.name || '',
            description: list.description,
            createdAt: list.created_at,
            updatedAt: list.updated_at,
            status: list.favorite ? 'favorite' : 'active',
            subscriberCount: list.membership_count || 0,
            ...list,
          }));

          allPublications.push(...mappedLists);

          // Check for next page using cursor-based pagination
          cursor = response.data.cursor?.next || null;
        } else {
          cursor = null;
        }
      } while (cursor);

      return allPublications;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid or expired access token: ${status}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Constant Contact API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers (contacts) for a specific contact list with pagination support
   * @param apiKey - The access token to use for authentication
   * @param publicationId - The contact list ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];
    let cursor: string | null = null;
    const limit = 500; // Constant Contact max limit per request

    try {
      do {
        const params: Record<string, any> = {
          lists: publicationId, // Filter by list ID
          limit,
          include: 'custom_fields,list_memberships,street_addresses',
          status: 'all', // Include all statuses
        };
        if (cursor) {
          params.cursor = cursor;
        }

        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/contacts`, {
            headers: this.getHeaders(apiKey),
            params,
          })
        );

        if (response.status === 200 && response.data) {
          const contacts = response.data.contacts || [];

          // Map Constant Contact contact data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = contacts.map(
            (contact: any) => ({
              id: contact.contact_id,
              email:
                contact.email_address?.address ||
                contact.email_addresses?.[0]?.address ||
                '',
              status: this.mapConstantContactStatus(
                contact.email_address?.permission_to_send
              ),
              firstName: contact.first_name || null,
              lastName: contact.last_name || null,
              subscribedAt: contact.created_at || null,
              unsubscribedAt: contact.deleted_at || null,
              customFields: this.extractCustomFields(contact),
              tags: contact.taggings || [],
              jobTitle: contact.job_title,
              companyName: contact.company_name,
              phoneNumbers: contact.phone_numbers || [],
              ...contact,
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check for next page using cursor-based pagination
          cursor = response.data.cursor?.next || null;
        } else {
          cursor = null;
        }
      } while (cursor);

      return allSubscribers;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid or expired access token: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Contact list not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Constant Contact API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Gets the total subscriber count for a specific contact list
   * Uses the contact_lists endpoint which includes membership_count
   * @param apiKey - The access token to use for authentication
   * @param publicationId - The contact list ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/contact_lists/${publicationId}`,
          {
            headers: this.getHeaders(apiKey),
            params: {
              include_membership_count: 'all',
            },
          }
        )
      );

      if (response.status === 200 && response.data) {
        // Constant Contact returns membership_count in list details
        return response.data.membership_count || 0;
      }

      return 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid or expired access token: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Contact list not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Constant Contact API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Constant Contact permission_to_send values to our standard status format
   * @param permissionToSend - The permission_to_send from Constant Contact API
   * @returns string - Mapped status value
   */
  private mapConstantContactStatus(permissionToSend: string): string {
    if (!permissionToSend) {
      return 'active';
    }

    const statusMap: Record<string, string> = {
      // Permission to send values
      implicit: 'active',
      explicit: 'active',
      pending_confirmation: 'pending',
      unsubscribed: 'unsubscribed',
      temp_hold: 'pending',
      not_set: 'pending',
    };

    const normalizedStatus = permissionToSend.toLowerCase();
    return statusMap[normalizedStatus] || 'active';
  }

  /**
   * Extracts custom fields from a Constant Contact contact
   * @param contact - The contact object from Constant Contact API
   * @returns Record<string, any> - Custom fields object
   */
  private extractCustomFields(contact: any): Record<string, any> {
    const customFields: Record<string, any> = {};

    // Extract custom_fields array
    if (contact.custom_fields && Array.isArray(contact.custom_fields)) {
      for (const field of contact.custom_fields) {
        if (field.custom_field_id && field.value !== undefined) {
          customFields[field.custom_field_id] = field.value;
        }
      }
    }

    // Include street addresses as custom data
    if (contact.street_addresses && Array.isArray(contact.street_addresses)) {
      customFields.streetAddresses = contact.street_addresses;
    }

    // Include any notes
    if (contact.notes) {
      customFields.notes = contact.notes;
    }

    // Include source info
    if (contact.source) {
      customFields.source = contact.source;
    }

    return customFields;
  }
}
