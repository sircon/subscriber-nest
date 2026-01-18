import { EspConnection } from './esp-connection.entity';
export declare enum SubscriberStatus {
    ACTIVE = "active",
    UNSUBSCRIBED = "unsubscribed",
    BOUNCED = "bounced"
}
export declare class Subscriber {
    id: string;
    espConnectionId: string;
    espConnection: EspConnection;
    externalId: string;
    encryptedEmail: string;
    maskedEmail: string;
    status: SubscriberStatus;
    firstName: string | null;
    lastName: string | null;
    subscribedAt: Date | null;
    unsubscribedAt: Date | null;
    metadata: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
}
