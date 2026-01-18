import { User } from './user.entity';
export declare enum BillingUsageStatus {
    PENDING = "pending",
    INVOICED = "invoiced",
    PAID = "paid",
    FAILED = "failed"
}
export declare class BillingUsage {
    id: string;
    userId: string;
    user: User;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    maxSubscriberCount: number;
    calculatedAmount: number;
    stripeInvoiceId: string | null;
    status: BillingUsageStatus;
    createdAt: Date;
    updatedAt: Date;
}
