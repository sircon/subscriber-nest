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
exports.SyncHistory = exports.SyncHistoryStatus = void 0;
const typeorm_1 = require("typeorm");
const esp_connection_entity_1 = require("./esp-connection.entity");
var SyncHistoryStatus;
(function (SyncHistoryStatus) {
    SyncHistoryStatus["SUCCESS"] = "success";
    SyncHistoryStatus["FAILED"] = "failed";
})(SyncHistoryStatus || (exports.SyncHistoryStatus = SyncHistoryStatus = {}));
let SyncHistory = class SyncHistory {
    id;
    espConnectionId;
    espConnection;
    status;
    startedAt;
    completedAt;
    errorMessage;
    subscriberCount;
    createdAt;
};
exports.SyncHistory = SyncHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SyncHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SyncHistory.prototype, "espConnectionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => esp_connection_entity_1.EspConnection, (espConnection) => espConnection.syncHistory),
    (0, typeorm_1.JoinColumn)({ name: 'espConnectionId' }),
    __metadata("design:type", esp_connection_entity_1.EspConnection)
], SyncHistory.prototype, "espConnection", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SyncHistoryStatus,
    }),
    __metadata("design:type", String)
], SyncHistory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], SyncHistory.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Object)
], SyncHistory.prototype, "subscriberCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SyncHistory.prototype, "createdAt", void 0);
exports.SyncHistory = SyncHistory = __decorate([
    (0, typeorm_1.Entity)('sync_history')
], SyncHistory);
//# sourceMappingURL=sync-history.entity.js.map