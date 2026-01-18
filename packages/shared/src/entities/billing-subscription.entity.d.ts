import { User } from './user.entity';
export declare enum BillingSubscriptionStatus {
    ACTIVE = "active",
    CANCELED = "canceled",
    PAST_DUE = "past_due",
    TRIALING = "trialing",
    INCOMPLETE = "incomplete",
    INCOMPLETE_EXPIRED = "incomplete_expired"
}
export declare class BillingSubscription {
    id: string;
    userId: string;
    user: User;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    stripeSubscriptionItemId: string | null;
    status: BillingSubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
