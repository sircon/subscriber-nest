import { Publication, SubscriberData } from './esp.interface';

/**
 * Abstract interface for ESP (Email Service Provider) connectors
 * All ESP implementations must implement this interface to ensure consistency
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
}
