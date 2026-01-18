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
exports.Subscriber = exports.SubscriberStatus = void 0;
const typeorm_1 = require("typeorm");
const esp_connection_entity_1 = require("./esp-connection.entity");
var SubscriberStatus;
(function (SubscriberStatus) {
    SubscriberStatus["ACTIVE"] = "active";
    SubscriberStatus["UNSUBSCRIBED"] = "unsubscribed";
    SubscriberStatus["BOUNCED"] = "bounced";
})(SubscriberStatus || (exports.SubscriberStatus = SubscriberStatus = {}));
let Subscriber = class Subscriber {
    id;
    espConnectionId;
    espConnection;
    externalId;
    encryptedEmail;
    maskedEmail;
    status;
    firstName;
    lastName;
    subscribedAt;
    unsubscribedAt;
    metadata;
    createdAt;
    updatedAt;
};
exports.Subscriber = Subscriber;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Subscriber.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Subscriber.prototype, "espConnectionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => esp_connection_entity_1.EspConnection, (espConnection) => espConnection.subscribers),
    (0, typeorm_1.JoinColumn)({ name: 'espConnectionId' }),
    __metadata("design:type", esp_connection_entity_1.EspConnection)
], Subscriber.prototype, "espConnection", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Subscriber.prototype, "externalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Subscriber.prototype, "encryptedEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Subscriber.prototype, "maskedEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SubscriberStatus,
        default: SubscriberStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], Subscriber.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Subscriber.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], Subscriber.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], Subscriber.prototype, "subscribedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], Subscriber.prototype, "unsubscribedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Subscriber.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Subscriber.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Subscriber.prototype, "updatedAt", void 0);
exports.Subscriber = Subscriber = __decorate([
    (0, typeorm_1.Entity)('subscribers'),
    (0, typeorm_1.Index)(['espConnectionId', 'externalId'], { unique: true })
], Subscriber);
//# sourceMappingURL=subscriber.entity.js.map