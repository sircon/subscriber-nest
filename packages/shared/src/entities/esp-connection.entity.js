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
exports.EspConnection = exports.EspSyncStatus = exports.EspConnectionStatus = exports.EspType = void 0;
const typeorm_1 = require("typeorm");
const subscriber_entity_1 = require("./subscriber.entity");
const user_entity_1 = require("./user.entity");
const sync_history_entity_1 = require("./sync-history.entity");
var EspType;
(function (EspType) {
    EspType["BEEHIIV"] = "beehiiv";
    EspType["KIT"] = "kit";
    EspType["MAILCHIMP"] = "mailchimp";
})(EspType || (exports.EspType = EspType = {}));
var EspConnectionStatus;
(function (EspConnectionStatus) {
    EspConnectionStatus["ACTIVE"] = "active";
    EspConnectionStatus["INVALID"] = "invalid";
    EspConnectionStatus["ERROR"] = "error";
})(EspConnectionStatus || (exports.EspConnectionStatus = EspConnectionStatus = {}));
var EspSyncStatus;
(function (EspSyncStatus) {
    EspSyncStatus["IDLE"] = "idle";
    EspSyncStatus["SYNCING"] = "syncing";
    EspSyncStatus["SYNCED"] = "synced";
    EspSyncStatus["ERROR"] = "error";
})(EspSyncStatus || (exports.EspSyncStatus = EspSyncStatus = {}));
let EspConnection = class EspConnection {
    id;
    userId;
    user;
    espType;
    encryptedApiKey;
    publicationId;
    status;
    syncStatus;
    lastValidatedAt;
    lastSyncedAt;
    createdAt;
    updatedAt;
    subscribers;
    syncHistory;
};
exports.EspConnection = EspConnection;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], EspConnection.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], EspConnection.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], EspConnection.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EspType,
    }),
    __metadata("design:type", String)
], EspConnection.prototype, "espType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], EspConnection.prototype, "encryptedApiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], EspConnection.prototype, "publicationId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EspConnectionStatus,
        default: EspConnectionStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], EspConnection.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EspSyncStatus,
        default: EspSyncStatus.IDLE,
    }),
    __metadata("design:type", String)
], EspConnection.prototype, "syncStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], EspConnection.prototype, "lastValidatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], EspConnection.prototype, "lastSyncedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], EspConnection.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], EspConnection.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => subscriber_entity_1.Subscriber, (subscriber) => subscriber.espConnection),
    __metadata("design:type", Array)
], EspConnection.prototype, "subscribers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => sync_history_entity_1.SyncHistory, (syncHistory) => syncHistory.espConnection),
    __metadata("design:type", Array)
], EspConnection.prototype, "syncHistory", void 0);
exports.EspConnection = EspConnection = __decorate([
    (0, typeorm_1.Entity)('esp_connections')
], EspConnection);
//# sourceMappingURL=esp-connection.entity.js.map