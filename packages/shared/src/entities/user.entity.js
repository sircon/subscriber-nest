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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const esp_connection_entity_1 = require("./esp-connection.entity");
const billing_subscription_entity_1 = require("./billing-subscription.entity");
const billing_usage_entity_1 = require("./billing-usage.entity");
let User = class User {
    id;
    email;
    isOnboarded;
    deleteRequestedAt;
    deletedAt;
    espConnections;
    billingSubscription;
    billingUsage;
    createdAt;
    updatedAt;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isOnboarded", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "deleteRequestedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => esp_connection_entity_1.EspConnection, (espConnection) => espConnection.user),
    __metadata("design:type", Array)
], User.prototype, "espConnections", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => billing_subscription_entity_1.BillingSubscription, (billingSubscription) => billingSubscription.user),
    __metadata("design:type", billing_subscription_entity_1.BillingSubscription)
], User.prototype, "billingSubscription", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => billing_usage_entity_1.BillingUsage, (billingUsage) => billingUsage.user),
    __metadata("design:type", Array)
], User.prototype, "billingUsage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map