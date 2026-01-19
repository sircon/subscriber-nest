import { DatabaseModule } from '@app/database/database.module';
import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { EspModule } from '../esp/esp.module';
import { SubscriberMapperService } from './subscriber-mapper.service';
import { SubscriberSyncService } from './subscriber-sync.service';

@Module({
  imports: [EncryptionModule, EspModule, BillingModule, DatabaseModule],
  providers: [SubscriberSyncService, SubscriberMapperService],
  exports: [SubscriberSyncService, SubscriberMapperService],
})
export class SyncModule {}
