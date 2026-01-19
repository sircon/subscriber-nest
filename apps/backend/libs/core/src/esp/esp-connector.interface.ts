import { Publication, SubscriberData } from './esp.interface';

/**
 * Abstract interface for ESP (Email Service Provider) connectors
 * All ESP implementations must implement this interface to ensure consistency
 *
 * Connectors can support either API key authentication (legacy) or OAuth authentication,
 * or both. OAuth methods are optional - connectors that don't support OAuth can omit them.
 */
export interface IEspConnector {
  /**
   * Validates an API key by making a test request to the ESP API
   * @param apiKey - The API key to validate
   * @param publicationId - Optional publication ID to validate against a specific publication
   * @returns Promise<boolean> - true if API key is valid, false otherwise
   */
  validateApiKey(apiKey: string, publicationId?: string): Promise<boolean>;

  /**
   * Fetches all publications available for the given API key
   * @param apiKey - The API key to use for authentication
   * @returns Promise<Publication[]> - List of publications
   */
  fetchPublications(apiKey: string): Promise<Publication[]>;

  /**
   * Fetches all subscribers for a specific publication
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The publication ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  fetchSubscribers(
    apiKey: string,
    publicationId: string
  ): Promise<SubscriberData[]>;

  /**
   * Gets the total subscriber count for a specific publication
   * This is a lightweight method that doesn't fetch all subscriber data
   * @param apiKey - The API key to use for authentication
   * @param publicationId - The publication ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  getSubscriberCount(apiKey: string, publicationId: string): Promise<number>;

  // OAuth methods (optional - for connectors that support OAuth)
  /**
   * Validates an OAuth access token by making a test request to the ESP API
   * @param accessToken - The OAuth access token to validate
   * @returns Promise<boolean> - true if access token is valid, false otherwise
   */
  validateAccessToken?(accessToken: string): Promise<boolean>;

  /**
   * Fetches all publications available for the given OAuth access token
   * Overload of fetchPublications for OAuth authentication
   * @param accessToken - The OAuth access token to use for authentication
   * @returns Promise<Publication[]> - List of publications
   */
  fetchPublicationsWithOAuth?(accessToken: string): Promise<Publication[]>;

  /**
   * Fetches all subscribers for a specific publication using OAuth access token
   * Overload of fetchSubscribers for OAuth authentication
   * @param accessToken - The OAuth access token to use for authentication
   * @param publicationId - The publication ID to fetch subscribers for
   * @returns Promise<SubscriberData[]> - List of subscribers
   */
  fetchSubscribersWithOAuth?(
    accessToken: string,
    publicationId: string
  ): Promise<SubscriberData[]>;

  /**
   * Gets the total subscriber count for a specific publication using OAuth access token
   * Overload of getSubscriberCount for OAuth authentication
   * This is a lightweight method that doesn't fetch all subscriber data
   * @param accessToken - The OAuth access token to use for authentication
   * @param publicationId - The publication ID to get subscriber count for
   * @returns Promise<number> - Total number of subscribers
   */
  getSubscriberCountWithOAuth?(
    accessToken: string,
    publicationId: string
  ): Promise<number>;
}
