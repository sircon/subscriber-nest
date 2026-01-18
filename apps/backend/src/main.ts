import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { AppModule } from './app.module';
import { setupBullBoard } from './bull-board';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: 'http://localhost:3000',
        credentials: true,
    });
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );
    
    // Setup Bull Board dashboard
    const subscriberSyncQueue = app.get(getQueueToken('subscriber-sync'));
    const bullBoardRouter = setupBullBoard([subscriberSyncQueue]);
    app.use('/admin/queues', bullBoardRouter);
    
    const port = process.env.PORT ?? 4000;
    await app.listen(port);
    console.log(`Backend is running on http://localhost:${port}`);
    console.log(`Bull Board dashboard: http://localhost:${port}/admin/queues`);
}

bootstrap();
