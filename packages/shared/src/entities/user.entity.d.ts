import { EspConnection } from './esp-connection.entity';
import { BillingSubscription } from './billing-subscription.entity';
import { BillingUsage } from './billing-usage.entity';
export declare class User {
    id: string;
    email: string;
    isOnboarded: boolean;
    deleteRequestedAt: Date | null;
    deletedAt: Date | null;
    espConnections: EspConnection[];
    billingSubscription: BillingSubscription;
    billingUsage: BillingUsage[];
    createdAt: Date;
    updatedAt: Date;
}
