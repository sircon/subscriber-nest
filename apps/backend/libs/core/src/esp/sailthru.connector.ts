import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Sailthru ESP Connector
 * Implements the IEspConnector interface for Sailthru API integration
 *
 * Sailthru is an email marketing and personalization platform.
 * Authentication uses API key + secret with HMAC-based signature authentication.
 *
 * API Key format: "apiKey|apiSecret" (compound format - API key and secret separated by pipe)
 *
 * API Documentation: https://getstarted.sailthru.com/developers/api-basics/
 * API Version: Current REST API (no versioning in URL, current as of January 2026)
 * - Base URL: https://api.sailthru.com
 * - Authentication: Signature-based using API secret
 * - Lists: Subscriber lists (equivalent to publications)
 * - Users: Individual subscribers
 */
@Injectable()
export class SailthruConnector implements IEspConnector {
  private readonly baseUrl = 'https://api.sailthru.com';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Parses the compound API key to extract API key and secret
   * Format: "apiKey|apiSecret"
   * @param apiKey - The compound API key string
   * @returns Object with apiKey and apiSecret
   */
  private parseApiKey(apiKey: string): { apiKey: string; apiSecret: string } {
    const parts = apiKey.split('|');
    if (parts.length !== 2) {
      throw new Error(
        'Invalid Sailthru API key format. Expected format: "apiKey|apiSecret"'
      );
    }
    return {
      apiKey: parts[0].trim(),
      apiSecret: parts[1].trim(),
    };
  }

  /**
   * Generates the Sailthru API signature
   * Sailthru uses HMAC-MD5 for signature generation
   * Signature = MD5(secret + sorted_values_concatenated)
   * @param apiSecret - The API secret for signing
   * @param params - The request parameters
   * @returns The signature string
   */
  private generateSignature(
    apiSecret: string,
    params: Record<string, any>
  ): string {
    // Extract values, flatten nested objects to JSON strings, sort, and concatenate
    const values = this.extractValues(params);
    values.sort();
    const valuesString = values.join('');

    // Create MD5 hash of secret + sorted values
    return crypto
      .createHash('md5')
      .update(apiSecret + valuesString)
      .digest('hex');
  }

  /**
   * Recursively extracts values from an object for signature generation
   * @param obj - The object to extract values from
   * @returns Array of string values
   */
  private extractValues(obj: any): string[] {
    const values: string[] = [];

    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          values.push(...this.extractValues(item));
        }
      } else {
        for (const key of Object.keys(obj)) {
          values.push(...this.extractValues(obj[key]));
        }
      }
    } else if (obj !== null && obj !== undefined) {
      values.push(String(obj));
    }

    return values;
  }

  /**
   * Makes a signed request to the Sailthru API
   * @param method - HTTP method (GET or POST)
   * @param action - API action/endpoint
   * @param apiKey - The API key
   * @param apiSecret - The API secret
   * @param params - Additional parameters
   * @returns Promise with response data
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    action: string,
    apiKey: string,
    apiSecret: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    // Build the full params object
    const fullParams: Record<string, any> = {
      ...params,
      api_key: apiKey,
      format: 'json',
    };

    // Generate signature
    const sig = this.generateSignature(apiSecret, fullParams);
    fullParams.sig = sig;

    const url = `${this.baseUrl}/${action}`;

    if (method === 'GET') {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: fullParams,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
      return response.data;
    } else {
      // POST request with form data
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(fullParams)) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }

      const response = await firstValueFrom(
        this.httpService.post(url, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
      return response.data;
    }
  }

  /**
   * Validates an API key by making a test request to the Sailthru API
   * @param apiKey - The compound API key to validate (format: "apiKey|apiSecret")
   * @param publicationId - Optional publication (list) ID to validate against
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      const { apiKey: actualApiKey, apiSecret } = this.parseApiKey(apiKey);

      // Use /settings endpoint to validate API key (lightweight call)
      await this.makeRequest<any>(
        'GET',
        'settings',
        actualApiKey,
        apiSecret,
        {}
      );

      // If publicationId is provided, verify it exists
      if (publicationId) {
        try {
          await this.makeRequest<any>('GET', 'list', actualApiKey, apiSecret, {
            list: publicationId,
          });
        } catch {
          return false;
        }
      }

      return true;
    } catch (error: any) {
      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        // 401/403 = Invalid API key
        if (status === 401 || status === 403) {
          return false;
        }
        // Check for Sailthru-specific error codes
        const errorCode = error.response.data?.error;
        if (errorCode === 5 || errorCode === 3) {
          // 5 = Invalid API key, 3 = Invalid signature
          return false;
        }
        console.error(
          `Sailthru API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or parse errors
      console.error('Sailthru API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications (lists) available for the given API key
   * @param apiKey - The compound API key to use for authentication
   * @returns Promise<Publication[]> - List of lists as publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      const { apiKey: actualApiKey, apiSecret } = this.parseApiKey(apiKey);

      const allPublications: Publication[] = [];

      // Fetch all lists - Sailthru returns all lists in one call
      const response = await this.makeRequest<any>(
        'GET',
        'list',
        actualApiKey,
        apiSecret,
        {}
      );

      // Response contains 'lists' array
      const lists = response.lists || [];

      for (const list of lists) {
        allPublications.push({
          id: list.name, // Sailthru uses list name as identifier
          name: list.name || '',
          type: list.type || 'normal',
          emailCount: list.email_count || 0,
          createTime: list.create_time || null,
          ...list,
        });
      }

      return allPublications;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const errorCode = error.response.data?.error;

        if (status === 401 || status === 403 || errorCode === 5) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Sailthru API server error: ${status}`);
        }
        throw new Error(
          `Failed to fetch publications: ${status} - ${error.response.data?.errormsg || ''}`
        );
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers (users) for a specific list
   * Uses the list export job to get all subscribers
   * @param apiKey - The compound API key to use for authentication
   * @param publicationId - The list name to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    try {
      const { apiKey: actualApiKey, apiSecret } = this.parseApiKey(apiKey);

      const allSubscribers: SubscriberData[] = [];

      // Sailthru uses job-based export for list members
      // First, create an export job
      const jobResponse = await this.makeRequest<any>(
        'POST',
        'job',
        actualApiKey,
        apiSecret,
        {
          job: 'export_list_data',
          list: publicationId,
          fields: JSON.stringify({
            profile: 1,
            activity: 0,
            engagement: 0,
          }),
        }
      );

      const jobId = jobResponse.job_id;
      if (!jobId) {
        throw new Error('Failed to create export job');
      }

      // Poll for job completion
      let jobStatus = 'pending';
      let exportUrl: string | null = null;
      const maxAttempts = 60; // 5 minutes max (5 second intervals)
      let attempts = 0;

      while (jobStatus === 'pending' && attempts < maxAttempts) {
        await this.delay(5000); // Wait 5 seconds between polls
        attempts++;

        const statusResponse = await this.makeRequest<any>(
          'GET',
          'job',
          actualApiKey,
          apiSecret,
          { job_id: jobId }
        );

        jobStatus = statusResponse.status || 'pending';
        if (statusResponse.export_url) {
          exportUrl = statusResponse.export_url;
        }
      }

      if (jobStatus !== 'completed' || !exportUrl) {
        // If job takes too long, fall back to fetching list info without member details
        console.warn(
          `Sailthru export job did not complete in time for list: ${publicationId}`
        );
        return allSubscribers;
      }

      // Download and parse the export file
      const exportResponse = await firstValueFrom(
        this.httpService.get(exportUrl, {
          responseType: 'text',
        })
      );

      // Parse the export data (JSON lines format)
      const lines = exportResponse.data.split('\n').filter((line: string) => line.trim());
      
      for (const line of lines) {
        try {
          const userData = JSON.parse(line);
          const subscriber = this.mapUserToSubscriber(userData);
          if (subscriber) {
            allSubscribers.push(subscriber);
          }
        } catch (parseError) {
          // Skip invalid lines
          console.warn('Failed to parse user data line:', parseError);
        }
      }

      return allSubscribers;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const errorCode = error.response.data?.error;

        if (status === 401 || status === 403 || errorCode === 5) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404 || errorCode === 99) {
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Sailthru API server error: ${status}`);
        }
        throw new Error(
          `Failed to fetch subscribers: ${status} - ${error.response.data?.errormsg || ''}`
        );
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Gets the total subscriber count for a specific list
   * Uses the list endpoint which includes email count
   * @param apiKey - The compound API key to use for authentication
   * @param publicationId - The list name to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const { apiKey: actualApiKey, apiSecret } = this.parseApiKey(apiKey);

      const response = await this.makeRequest<any>(
        'GET',
        'list',
        actualApiKey,
        apiSecret,
        { list: publicationId }
      );

      // Sailthru returns email_count in list details
      return response.email_count || response.count || 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const errorCode = error.response.data?.error;

        if (status === 401 || status === 403 || errorCode === 5) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404 || errorCode === 99) {
          throw new Error(`List not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Sailthru API server error: ${status}`);
        }
        throw new Error(
          `Failed to fetch subscriber count: ${status} - ${error.response.data?.errormsg || ''}`
        );
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Sailthru user data to our standard SubscriberData format
   * @param userData - The user object from Sailthru export
   * @returns SubscriberData or null if invalid
   */
  private mapUserToSubscriber(userData: any): SubscriberData | null {
    if (!userData || !userData.email) {
      return null;
    }

    // Get profile data which contains user details
    const profile = userData.profile || userData;

    return {
      id: userData.id || userData.email,
      email: userData.email,
      status: this.mapSailthruStatus(userData),
      firstName:
        profile.first_name ||
        profile.firstName ||
        this.extractFirstName(profile.name) ||
        null,
      lastName:
        profile.last_name ||
        profile.lastName ||
        this.extractLastName(profile.name) ||
        null,
      subscribedAt: userData.create_time
        ? new Date(userData.create_time * 1000).toISOString()
        : null,
      unsubscribedAt: userData.optout_time
        ? new Date(userData.optout_time * 1000).toISOString()
        : null,
      customFields: this.extractCustomFields(profile),
      ...profile,
    };
  }

  /**
   * Maps Sailthru user status to our standard status format
   * Sailthru uses optout flags and validity status
   * @param userData - The user object from Sailthru
   * @returns string - Mapped status value
   */
  private mapSailthruStatus(userData: any): string {
    // Check for global optout
    if (userData.optout_email === 'all' || userData.optout_email === 'basic') {
      return 'unsubscribed';
    }

    // Check for hard bounce
    if (userData.hardbounce_time) {
      return 'bounced';
    }

    // Check validity
    if (userData.valid === false) {
      return 'invalid';
    }

    // Default to active
    return 'active';
  }

  /**
   * Extracts first name from a full name string
   * @param name - Full name string
   * @returns First name or null
   */
  private extractFirstName(name?: string): string | null {
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    return parts[0] || null;
  }

  /**
   * Extracts last name from a full name string
   * @param name - Full name string
   * @returns Last name or null
   */
  private extractLastName(name?: string): string | null {
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : null;
  }

  /**
   * Extracts custom fields from the profile object
   * @param profile - The profile object from Sailthru
   * @returns Object with custom field values
   */
  private extractCustomFields(profile: any): Record<string, any> {
    const customFields: Record<string, any> = {};
    const excludedFields = new Set([
      'email',
      'id',
      'first_name',
      'firstName',
      'last_name',
      'lastName',
      'name',
      'optout_email',
      'optout_time',
      'create_time',
      'hardbounce_time',
      'valid',
    ]);

    // Copy all non-standard fields as custom fields
    for (const [key, value] of Object.entries(profile || {})) {
      if (!excludedFields.has(key) && value !== undefined && value !== null) {
        customFields[key] = value;
      }
    }

    return customFields;
  }

  /**
   * Helper function to delay execution
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
