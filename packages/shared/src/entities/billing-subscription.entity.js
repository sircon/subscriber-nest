"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingSubscription = exports.BillingSubscriptionStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
var BillingSubscriptionStatus;
(function (BillingSubscriptionStatus) {
    BillingSubscriptionStatus["ACTIVE"] = "active";
    BillingSubscriptionStatus["CANCELED"] = "canceled";
    BillingSubscriptionStatus["PAST_DUE"] = "past_due";
    BillingSubscriptionStatus["TRIALING"] = "trialing";
    BillingSubscriptionStatus["INCOMPLETE"] = "incomplete";
    BillingSubscriptionStatus["INCOMPLETE_EXPIRED"] = "incomplete_expired";
})(BillingSubscriptionStatus || (exports.BillingSubscriptionStatus = BillingSubscriptionStatus = {}));
let BillingSubscription = class BillingSubscription {
    id;
    userId;
    user;
    stripeCustomerId;
    stripeSubscriptionId;
    stripePriceId;
    stripeSubscriptionItemId;
    status;
    currentPeriodStart;
    currentPeriodEnd;
    cancelAtPeriodEnd;
    canceledAt;
    createdAt;
    updatedAt;
};
exports.BillingSubscription = BillingSubscription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BillingSubscription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', unique: true }),
    __metadata("design:type", String)
], BillingSubscription.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], BillingSubscription.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], BillingSubscription.prototype, "stripeCustomerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true, nullable: true }),
    __metadata("design:type", Object)
], BillingSubscription.prototype, "stripeSubscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BillingSubscription.prototype, "stripePriceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BillingSubscription.prototype, "stripeSubscriptionItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BillingSubscriptionStatus,
    }),
    __metadata("design:type", String)
], BillingSubscription.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], BillingSubscription.prototype, "currentPeriodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], BillingSubscription.prototype, "currentPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BillingSubscription.prototype, "cancelAtPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], BillingSubscription.prototype, "canceledAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BillingSubscription.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BillingSubscription.prototype, "updatedAt", void 0);
exports.BillingSubscription = BillingSubscription = __decorate([
    (0, typeorm_1.Entity)('billing_subscriptions')
], BillingSubscription);
//# sourceMappingURL=billing-subscription.entity.js.map