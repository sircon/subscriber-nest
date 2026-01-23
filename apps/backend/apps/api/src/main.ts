import { getQueueToken } from '@nestjs/bullmq';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';
import { setupBullBoard } from './bull-board';

async function bootstrap() {
  try {
    console.log('=== Starting API Application ===');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`DATABASE_HOST: ${process.env.DATABASE_HOST || 'not set'}`);
    console.log(`DATABASE_PORT: ${process.env.DATABASE_PORT || 'not set'}`);
    console.log(`DATABASE_NAME: ${process.env.DATABASE_NAME || 'not set'}`);
    console.log(`DATABASE_USER: ${process.env.DATABASE_USER || 'not set'}`);
    console.log(`REDIS_HOST: ${process.env.REDIS_HOST || 'not set'}`);
    console.log(`REDIS_PORT: ${process.env.REDIS_PORT || 'not set'}`);

    console.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      rawBody: true,
    });
    
    console.log('Configuring CORS...');
    app.enableCors({
      origin: ['http://localhost:3099', 'https://audiencesafe.com'],
      credentials: true,
    });

    // Preserve raw body for Stripe webhook endpoint
    app.use('/billing/webhook', express.raw({ type: 'application/json' }));

    console.log('Setting up validation pipes...');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );

    console.log('Setting up Bull Board dashboard...');
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

    // Use API_PORT if set, otherwise fall back to PORT, default to 4000
    const port = parseInt(process.env.API_PORT || process.env.PORT || '4000', 10);
    console.log(`Starting server on port ${port}...`);
    await app.listen(port);
    console.log(`✓ Backend is running on http://localhost:${port}`);
    console.log(`✓ Bull Board dashboard: http://localhost:${port}/admin/queues`);
    console.log(`✓ Health check available at: http://localhost:${port}/health`);
  } catch (error) {
    console.error('=== FATAL ERROR during bootstrap ===');
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('=== UNHANDLED ERROR in bootstrap ===');
  console.error('Error details:', error);
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  process.exit(1);
});
