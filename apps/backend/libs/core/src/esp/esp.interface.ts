/**
 * Publication data structure returned by ESP APIs
 *
 * Note: This interface is named 'Publication' for code consistency, but it represents
 * different concepts depending on the ESP:
 * - Lists (Email Octopus, MailerLite, PostUp, Constant Contact, Iterable, SendGrid, Brevo)
 * - Segments (Mailchimp)
 * - Publications (Beehiiv, Kit)
 * - Products (Omeda)
 * - Recipient Lists (SparkPost)
 * - Contact Lists (ActiveCampaign, Customer.io)
 * - Clients' Lists (Campaign Monitor)
 * - Site (Ghost)
 *
 * All ESP connectors return objects conforming to this interface via fetchPublications()
 * or fetchPublicationsWithOAuth() methods, ensuring consistent data structure across
 * different ESP terminology.
 */
export interface Publication {
  /** Unique identifier for the list/segment/publication */
  id: string;
  /** Display name of the list/segment/publication */
  name: string;
  /** Optional subscriber count (may be named subscriberCount, contactCount, etc. depending on ESP) */
  subscriberCount?: number;
  /** Optional description of the list/segment/publication */
  description?: string;
  /** Optional creation date/timestamp */
  createdAt?: string | Date;
  /** Allow additional ESP-specific fields (e.g., clientId, clientName, listType, etc.) */
  [key: string]: any;
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
