import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { IEspConnector } from './esp-connector.interface';
import { Publication, SubscriberData } from './esp.interface';

/**
 * Ghost ESP Connector
 * Implements the IEspConnector interface for Ghost Admin API integration
 *
 * Ghost uses JWT authentication with Admin API keys in the format `{id}:{secret}`.
 * The API key must be parsed to extract the key ID and secret for JWT signing.
 *
 * API Documentation: https://ghost.org/docs/admin-api/
 * API Version: Current Admin API (no versioning in URL, current as of January 2026)
 */
@Injectable()
export class GhostConnector implements IEspConnector {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Parses the Ghost API key to extract base URL, key ID, and secret
   * Ghost API key format: "{siteUrl}|{id}:{secret}" where siteUrl is the Ghost site URL
   * For simplicity, we also support just "{id}:{secret}" and require siteUrl to be passed separately
   * @param apiKey - The API key in format "siteUrl|id:secret" or "id:secret"
   * @returns Parsed components { siteUrl, keyId, secret } or null if invalid
   */
  private parseApiKey(apiKey: string): {
    siteUrl: string | null;
    keyId: string;
    secret: string;
  } | null {
    try {
      let siteUrl: string | null = null;
      let keyPart = apiKey;

      // Check if API key contains site URL (format: "siteUrl|id:secret")
      if (apiKey.includes('|')) {
        const [url, key] = apiKey.split('|');
        siteUrl = url.replace(/\/+$/, ''); // Remove trailing slashes
        keyPart = key;
      }

      // Parse the id:secret part
      const parts = keyPart.split(':');
      if (parts.length !== 2) {
        return null;
      }

      const [keyId, secret] = parts;

      // Validate both parts are hex strings
      if (!/^[a-f0-9]+$/i.test(keyId) || !/^[a-f0-9]+$/i.test(secret)) {
        return null;
      }

      return { siteUrl, keyId, secret };
    } catch {
      return null;
    }
  }

  /**
   * Creates a JWT token for Ghost Admin API authentication
   * @param keyId - The API key ID
   * @param secret - The API key secret (hex string)
   * @returns JWT token string
   */
  private createJwtToken(keyId: string, secret: string): string {
    // Create JWT header
    const header = {
      alg: 'HS256',
      typ: 'JWT',
      kid: keyId,
    };

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now,
      exp: now + 300, // Token expires in 5 minutes
      aud: '/admin/',
    };

    // Base64URL encode header and payload
    const base64UrlEncode = (obj: object): string => {
      const json = JSON.stringify(obj);
      const base64 = Buffer.from(json).toString('base64');
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);

    // Create signature using HMAC-SHA256 with the secret (hex decoded)
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const secretBuffer = Buffer.from(secret, 'hex');
    const signature = crypto
      .createHmac('sha256', secretBuffer)
      .update(signatureInput)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Extracts the site URL from the API key or throws if not present
   * @param apiKey - The full API key
   * @returns The site URL
   */
  private getSiteUrl(apiKey: string): string {
    const parsed = this.parseApiKey(apiKey);
    if (!parsed || !parsed.siteUrl) {
      throw new Error(
        'Ghost API key must include site URL in format: https://yoursite.ghost.io|id:secret'
      );
    }
    return parsed.siteUrl;
  }

  /**
   * Validates an API key by making a test request to the Ghost Admin API
   * @param apiKey - The API key in format "siteUrl|id:secret"
   * @param publicationId - Optional publication ID (not used for Ghost as it's single-site)
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string
  ): Promise<boolean> {
    try {
      const parsed = this.parseApiKey(apiKey);
      if (!parsed || !parsed.siteUrl) {
        return false;
      }

      const token = this.createJwtToken(parsed.keyId, parsed.secret);
      const baseUrl = `${parsed.siteUrl}/ghost/api/admin`;

      // Use the /site/ endpoint to validate the API key
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/site/`, {
          headers: {
            Authorization: `Ghost ${token}`,
          },
        })
      );

      return response.status === 200;
    } catch (error: any) {
      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          return false;
        }
        console.error(
          `Ghost API error during validation: ${status}`,
          error.response.data
        );
        return false;
      }
      // Network errors or other issues
      console.error('Ghost API validation error:', error.message);
      return false;
    }
  }

  /**
   * Fetches all publications available for the given API key
   * Ghost is a single-site platform, so this returns the site itself as a publication
   * @param apiKey - The API key in format "siteUrl|id:secret"
   * @returns Promise<Publication[]> - List containing the Ghost site as a publication
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      const parsed = this.parseApiKey(apiKey);
      if (!parsed || !parsed.siteUrl) {
        throw new Error(
          'Ghost API key must include site URL in format: https://yoursite.ghost.io|id:secret'
        );
      }

      const token = this.createJwtToken(parsed.keyId, parsed.secret);
      const baseUrl = `${parsed.siteUrl}/ghost/api/admin`;

      // Fetch site information to use as the "publication"
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/site/`, {
          headers: {
            Authorization: `Ghost ${token}`,
          },
        })
      );

      if (response.status === 200 && response.data && response.data.site) {
        const site = response.data.site;
        return [
          {
            id: site.url || parsed.siteUrl,
            name: site.title || 'Ghost Publication',
            description: site.description || '',
            url: site.url,
            ...site,
          },
        ];
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
          throw new Error(`Ghost API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`
      );
    }
  }

  /**
   * Fetches all subscribers (members) for the Ghost site with pagination support
   * @param apiKey - The API key in format "siteUrl|id:secret"
   * @param publicationId - The publication ID (site URL, used for validation)
   * @returns Promise<SubscriberData[]> - List of subscribers/members
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];
    let page = 1;
    let hasMore = true;
    const limit = 100; // Ghost API default limit

    try {
      const parsed = this.parseApiKey(apiKey);
      if (!parsed || !parsed.siteUrl) {
        throw new Error(
          'Ghost API key must include site URL in format: https://yoursite.ghost.io|id:secret'
        );
      }

      const token = this.createJwtToken(parsed.keyId, parsed.secret);
      const baseUrl = `${parsed.siteUrl}/ghost/api/admin`;

      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(`${baseUrl}/members/`, {
            headers: {
              Authorization: `Ghost ${token}`,
            },
            params: {
              page,
              limit,
            },
          })
        );

        if (response.status === 200 && response.data) {
          const members = response.data.members || [];

          // Map Ghost member data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = members.map(
            (member: any) => ({
              id: member.id || member.uuid || '',
              email: member.email || '',
              status: this.mapGhostStatus(member.status, member.subscribed),
              firstName: member.name ? member.name.split(' ')[0] : null,
              lastName: member.name
                ? member.name.split(' ').slice(1).join(' ') || null
                : null,
              subscribedAt: member.created_at || null,
              unsubscribedAt: member.subscribed === false ? member.updated_at : null,
              memberStatus: member.status, // free, paid, comped
              subscribed: member.subscribed,
              labels: member.labels || [],
              note: member.note,
              geolocation: member.geolocation,
              ...member,
            })
          );

          allSubscribers.push(...mappedSubscribers);

          // Check pagination from Ghost API meta
          const meta = response.data.meta?.pagination;
          if (meta) {
            hasMore = meta.next !== null && members.length > 0;
            page = meta.next || page + 1;
          } else {
            hasMore = members.length === limit;
            page++;
          }
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
          throw new Error(`Publication not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Ghost API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`
      );
    }
  }

  /**
   * Gets the total subscriber (member) count for the Ghost site
   * Uses the members endpoint with minimal data to get the count
   * @param apiKey - The API key in format "siteUrl|id:secret"
   * @param publicationId - The publication ID (site URL)
   * @returns Promise<number> - Total number of members
   */
  async getSubscriberCount(
    apiKey: string,
    publicationId: string
  ): Promise<number> {
    try {
      const parsed = this.parseApiKey(apiKey);
      if (!parsed || !parsed.siteUrl) {
        throw new Error(
          'Ghost API key must include site URL in format: https://yoursite.ghost.io|id:secret'
        );
      }

      const token = this.createJwtToken(parsed.keyId, parsed.secret);
      const baseUrl = `${parsed.siteUrl}/ghost/api/admin`;

      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/members/`, {
          headers: {
            Authorization: `Ghost ${token}`,
          },
          params: {
            page: 1,
            limit: 1, // Only fetch 1 member to get the total count from metadata
          },
        })
      );

      if (response.status === 200 && response.data) {
        // Ghost API returns pagination info in meta
        return response.data.meta?.pagination?.total || 0;
      }

      return 0;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 404) {
          throw new Error(`Publication not found: ${publicationId}`);
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (status >= 500) {
          throw new Error(`Ghost API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscriber count: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscriber count: ${error.message}`
      );
    }
  }

  /**
   * Maps Ghost member status to our standard status format
   * @param memberStatus - The member status from Ghost API (free, paid, comped)
   * @param subscribed - Whether the member is subscribed to emails
   * @returns string - Mapped status value
   */
  private mapGhostStatus(memberStatus: string, subscribed: boolean): string {
    // If not subscribed to emails, they're effectively unsubscribed
    if (subscribed === false) {
      return 'unsubscribed';
    }

    // Otherwise, they're active
    return 'active';
  }
}
