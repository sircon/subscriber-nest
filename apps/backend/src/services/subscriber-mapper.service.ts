import { Injectable } from '@nestjs/common';
import { SubscriberData } from '../interfaces/esp.interface';
import { CreateSubscriberDto } from '../dto/create-subscriber.dto';
import { SubscriberStatus } from '../entities/subscriber.entity';
import { EncryptionService } from './encryption.service';
import { maskEmail } from '../utils/email.util';

/**
 * Service for mapping ESP subscriber data to our database schema
 */
@Injectable()
export class SubscriberMapperService {
  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Maps Beehiiv (or other ESP) subscriber data to CreateSubscriberDto
   * - Encrypts email address
   * - Creates masked email for display
   * - Maps status to our SubscriberStatus enum
   * - Maps date fields (handles both Date objects and ISO strings)
   * - Stores all other ESP-specific fields in metadata
   *
   * @param subscriberData - Raw subscriber data from ESP API
   * @param espConnectionId - The ID of the ESP connection
   * @returns CreateSubscriberDto ready for database storage
   */
  mapToCreateSubscriberDto(
    subscriberData: SubscriberData,
    espConnectionId: string
  ): CreateSubscriberDto {
    // Extract known fields that we map to specific columns
    const {
      id: externalId,
      email,
      status,
      firstName,
      lastName,
      subscribedAt,
      unsubscribedAt,
      ...restFields // All other fields go to metadata
    } = subscriberData;

    // Validate required fields
    if (!externalId) {
      throw new Error('Subscriber externalId is required');
    }
    if (!email) {
      throw new Error('Subscriber email is required');
    }

    // Encrypt email
    const encryptedEmail = this.encryptionService.encrypt(email);

    // Create masked email
    const maskedEmail = maskEmail(email);

    // Map status to our enum
    const mappedStatus = this.mapStatusToEnum(status);

    // Map date fields (handle both Date objects and ISO strings)
    const mappedSubscribedAt = this.mapDate(subscribedAt);
    const mappedUnsubscribedAt = this.mapDate(unsubscribedAt);

    // Build metadata object with all ESP-specific fields
    // Exclude fields that we're mapping to specific columns
    const metadata: Record<string, any> = {};
    Object.keys(restFields).forEach((key) => {
      // Only include fields that aren't already mapped
      if (
        ![
          'id',
          'email',
          'status',
          'firstName',
          'lastName',
          'subscribedAt',
          'unsubscribedAt',
        ].includes(key)
      ) {
        const value = restFields[key];
        // Only include non-null/undefined values
        if (value !== null && value !== undefined) {
          metadata[key] = value;
        }
      }
    });

    return {
      espConnectionId,
      externalId,
      encryptedEmail,
      maskedEmail,
      status: mappedStatus,
      firstName: firstName || null,
      lastName: lastName || null,
      subscribedAt: mappedSubscribedAt,
      unsubscribedAt: mappedUnsubscribedAt,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    };
  }

  /**
   * Maps ESP status string to our SubscriberStatus enum
   * @param status - Status from ESP API
   * @returns SubscriberStatus enum value
   */
  private mapStatusToEnum(status: string | undefined | null): SubscriberStatus {
    if (!status) {
      return SubscriberStatus.ACTIVE;
    }

    const normalizedStatus = status.toLowerCase().trim();

    // Map common status values
    if (normalizedStatus === 'active' || normalizedStatus === 'subscribed') {
      return SubscriberStatus.ACTIVE;
    }
    if (normalizedStatus === 'unsubscribed') {
      return SubscriberStatus.UNSUBSCRIBED;
    }
    if (
      normalizedStatus === 'bounced' ||
      normalizedStatus === 'spam' ||
      normalizedStatus === 'invalid'
    ) {
      return SubscriberStatus.BOUNCED;
    }

    // Default to ACTIVE if status doesn't match known values
    return SubscriberStatus.ACTIVE;
  }

  /**
   * Maps date value (Date object or ISO string) to Date object or null
   * @param dateValue - Date value from ESP API
   * @returns Date object or null
   */
  private mapDate(dateValue: Date | string | null | undefined): Date | null {
    if (!dateValue) {
      return null;
    }

    // If already a Date object, return it
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If string, try to parse it
    if (typeof dateValue === 'string') {
      try {
        const parsed = new Date(dateValue);
        // Check if date is valid
        if (isNaN(parsed.getTime())) {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    }

    return null;
  }
}
