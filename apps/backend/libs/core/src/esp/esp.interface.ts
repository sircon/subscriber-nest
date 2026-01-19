/**
 * Publication data structure returned by ESP APIs
 */
export interface Publication {
  id: string;
  name: string;
  [key: string]: any; // Allow additional ESP-specific fields
}

/**
 * Subscriber data structure returned by ESP APIs
 */
export interface SubscriberData {
  id: string; // ESP's subscriber ID (externalId)
  email: string;
  status: string; // ESP-specific status (will be mapped to our SubscriberStatus enum)
  firstName?: string | null;
  lastName?: string | null;
  subscribedAt?: Date | string | null;
  unsubscribedAt?: Date | string | null;
  [key: string]: any; // Allow additional ESP-specific fields (tags, custom fields, etc.)
}
