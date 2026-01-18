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
exports.BillingUsage = exports.BillingUsageStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
var BillingUsageStatus;
(function (BillingUsageStatus) {
    BillingUsageStatus["PENDING"] = "pending";
    BillingUsageStatus["INVOICED"] = "invoiced";
    BillingUsageStatus["PAID"] = "paid";
    BillingUsageStatus["FAILED"] = "failed";
})(BillingUsageStatus || (exports.BillingUsageStatus = BillingUsageStatus = {}));
let BillingUsage = class BillingUsage {
    id;
    userId;
    user;
    billingPeriodStart;
    billingPeriodEnd;
    maxSubscriberCount;
    calculatedAmount;
    stripeInvoiceId;
    status;
    createdAt;
    updatedAt;
};
exports.BillingUsage = BillingUsage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BillingUsage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], BillingUsage.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], BillingUsage.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], BillingUsage.prototype, "billingPeriodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], BillingUsage.prototype, "billingPeriodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], BillingUsage.prototype, "maxSubscriberCount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
    }),
    __metadata("design:type", Number)
], BillingUsage.prototype, "calculatedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], BillingUsage.prototype, "stripeInvoiceId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BillingUsageStatus,
    }),
    __metadata("design:type", String)
], BillingUsage.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BillingUsage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BillingUsage.prototype, "updatedAt", void 0);
exports.BillingUsage = BillingUsage = __decorate([
    (0, typeorm_1.Entity)('billing_usage'),
    (0, typeorm_1.Index)(['userId', 'billingPeriodStart'], { unique: true })
], BillingUsage);
//# sourceMappingURL=billing-usage.entity.js.map