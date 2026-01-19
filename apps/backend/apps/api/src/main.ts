import { getQueueToken } from '@nestjs/bullmq';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';
import { setupBullBoard } from './bull-board';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Preserve raw body for Stripe webhook endpoint
  app.use('/billing/webhook', express.raw({ type: 'application/json' }));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Setup Bull Board dashboard
  const subscriberSyncQueue = app.get(getQueueToken('subscriber-sync'));
  const billingQueue = app.get(getQueueToken('billing'));
  const accountDeletionQueue = app.get(getQueueToken('account-deletion'));
  const bullBoardRouter = setupBullBoard([
    subscriberSyncQueue,
    billingQueue,
    accountDeletionQueue,
  ]);
  app.use('/admin/queues', bullBoardRouter);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend is running on http://localhost:${port}`);
  console.log(`Bull Board dashboard: http://localhost:${port}/admin/queues`);
}

bootstrap();
