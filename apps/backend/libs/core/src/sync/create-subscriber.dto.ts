import { SubscriberStatus } from "@app/database/entities/subscriber.entity";


export class CreateSubscriberDto {
  espConnectionId: string;
  externalId: string;
  encryptedEmail: string;
  maskedEmail: string;
  status: SubscriberStatus;
  firstName?: string | null;
  lastName?: string | null;
  subscribedAt?: Date | null;
  unsubscribedAt?: Date | null;
  metadata?: Record<string, any> | null;
}
