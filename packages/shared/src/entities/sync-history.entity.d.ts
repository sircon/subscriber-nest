import { EspConnection } from './esp-connection.entity';
export declare enum SyncHistoryStatus {
    SUCCESS = "success",
    FAILED = "failed"
}
export declare class SyncHistory {
    id: string;
    espConnectionId: string;
    espConnection: EspConnection;
    status: SyncHistoryStatus;
    startedAt: Date;
    completedAt: Date | null;
    errorMessage: string | null;
    subscriberCount: number | null;
    createdAt: Date;
}
