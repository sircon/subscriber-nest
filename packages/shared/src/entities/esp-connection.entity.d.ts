import { Subscriber } from './subscriber.entity';
import { User } from './user.entity';
import { SyncHistory } from './sync-history.entity';
export declare enum EspType {
    BEEHIIV = "beehiiv",
    KIT = "kit",
    MAILCHIMP = "mailchimp"
}
export declare enum EspConnectionStatus {
    ACTIVE = "active",
    INVALID = "invalid",
    ERROR = "error"
}
export declare enum EspSyncStatus {
    IDLE = "idle",
    SYNCING = "syncing",
    SYNCED = "synced",
    ERROR = "error"
}
export declare class EspConnection {
    id: string;
    userId: string;
    user: User;
    espType: EspType;
    encryptedApiKey: string;
    publicationId: string;
    status: EspConnectionStatus;
    syncStatus: EspSyncStatus;
    lastValidatedAt: Date | null;
    lastSyncedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    subscribers: Subscriber[];
    syncHistory: SyncHistory[];
}
