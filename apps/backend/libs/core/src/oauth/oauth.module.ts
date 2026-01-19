import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database/database.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { OAuthConfigService } from './oauth-config.service';
import { OAuthTokenRefreshService } from './oauth-token-refresh.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    DatabaseModule,
    EncryptionModule,
  ],
  providers: [
    OAuthConfigService,
    OAuthTokenRefreshService,
  ],
  exports: [
    OAuthConfigService,
    OAuthTokenRefreshService,
  ],
})
export class OAuthModule {}
