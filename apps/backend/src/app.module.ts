import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailService } from './email.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { VerificationCode } from './entities/verification-code.entity';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { EspConnection } from './entities/esp-connection.entity';
import { EspConnectionController } from './esp-connection.controller';
import { EspConnectionService } from './esp-connection.service';
import { EncryptionService } from './encryption.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'subscriber_nest',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([VerificationCode, User, Session, EspConnection]),
  ],
  controllers: [AppController, AuthController, EspConnectionController],
  providers: [
    AppService,
    EmailService,
    AuthService,
    AuthGuard,
    EspConnectionService,
    EncryptionService,
  ],
  exports: [EmailService],
})
export class AppModule {}
