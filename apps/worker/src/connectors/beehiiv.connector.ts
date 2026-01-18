import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { IEspConnector } from "../interfaces/esp-connector.interface";
import { Publication, SubscriberData } from "../interfaces/esp.interface";

/**
 * Beehiiv ESP Connector
 * Implements the IEspConnector interface for Beehiiv API integration
 */
@Injectable()
export class BeehiivConnector implements IEspConnector {
  private readonly baseUrl = "https://api.beehiiv.com/v2";

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validates an API key by making a test request to the Beehiiv API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication ID to validate against a specific publication
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  async validateApiKey(
    apiKey: string,
    publicationId?: string,
  ): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/publications`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }),
      );

      // If status is 200, the API key is valid
      if (response.status === 200 && response.data) {
        // If publicationId is provided, check if it exists in the publications list
        if (publicationId) {
          const publications = response.data.data || [];
          return publications.some((pub: any) => pub.id === publicationId);
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
          `Beehiiv API error during validation: ${status}`,
          error.response.data,
        );
        return false;
      }
      // Network errors or other issues
      console.error("Beehiiv API validation error:", error.message);
      return false;
    }
  }

  /**
   * Fetches all publications available for the given API key
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of publications
   */
  async fetchPublications(apiKey: string): Promise<Publication[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/publications`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }),
      );

      if (response.status === 200 && response.data && response.data.data) {
        return response.data.data.map((pub: any) => ({
          id: pub.id,
          name: pub.name || pub.title || "",
          ...pub, // Include all other fields
        }));
      }

      return [];
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(`Invalid API key: ${status}`);
        }
        if (status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (status >= 500) {
          throw new Error(`Beehiiv API server error: ${status}`);
        }
        throw new Error(`Failed to fetch publications: ${status}`);
      }
      throw new Error(
        `Network error while fetching publications: ${error.message}`,
      );
    }
  }

  /**
   * Fetches all subscribers for a specific publication with pagination support
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The publication ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  async fetchSubscribers(
    apiKey: string,
    publicationId: string,
  ): Promise<SubscriberData[]> {
    const allSubscribers: SubscriberData[] = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await firstValueFrom(
          this.httpService.get(
            `${this.baseUrl}/publications/${publicationId}/subscriptions`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
              params: {
                page,
                limit: 100, // Beehiiv API typically supports up to 100 per page
              },
            },
          ),
        );

        if (response.status === 200 && response.data) {
          const subscribers = response.data.data || [];

          // Map Beehiiv subscriber data to our SubscriberData interface
          const mappedSubscribers: SubscriberData[] = subscribers.map(
            (sub: any) => ({
              id: sub.id || sub.subscriber_id || "",
              email: sub.email || "",
              status: this.mapBeehiivStatus(sub.status),
              firstName: sub.first_name || sub.firstName || null,
              lastName: sub.last_name || sub.lastName || null,
              subscribedAt: sub.created_at || sub.subscribed_at || null,
              unsubscribedAt: sub.unsubscribed_at || sub.unsubscribedAt || null,
              ...sub, // Include all other Beehiiv-specific fields
            }),
          );

          allSubscribers.push(...mappedSubscribers);

          // Check if there are more pages
          // Beehiiv API typically returns pagination info in response
          const totalPages =
            response.data.total_pages || response.data.pages || 1;
          const currentPage = response.data.page || page;
          hasMore = currentPage < totalPages && subscribers.length > 0;
          page++;
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
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (status >= 500) {
          throw new Error(`Beehiiv API server error: ${status}`);
        }
        throw new Error(`Failed to fetch subscribers: ${status}`);
      }
      throw new Error(
        `Network error while fetching subscribers: ${error.message}`,
      );
    }
  }

  /**
   * Maps Beehiiv status values to our standard status format
   * @param beehiivStatus - The status from Beehiiv API
   * @returns string - Mapped status value
   */
  private mapBeehiivStatus(beehiivStatus: string): string {
    const statusMap: Record<string, string> = {
      active: "active",
      subscribed: "active",
      unsubscribed: "unsubscribed",
      bounced: "bounced",
      spam: "bounced",
      invalid: "bounced",
    };

    const normalized = (beehiivStatus || "").toLowerCase();
    return statusMap[normalized] || beehiivStatus || "active";
  }
}
