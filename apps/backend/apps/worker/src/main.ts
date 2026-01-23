import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  try {
    console.log('=== Starting Worker Application ===');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`DATABASE_HOST: ${process.env.DATABASE_HOST || 'not set'}`);
    console.log(`DATABASE_PORT: ${process.env.DATABASE_PORT || 'not set'}`);
    console.log(`DATABASE_NAME: ${process.env.DATABASE_NAME || 'not set'}`);
    console.log(`DATABASE_USER: ${process.env.DATABASE_USER || 'not set'}`);
    console.log(
      `DATABASE_PASSWORD: ${process.env.DATABASE_PASSWORD || 'not set'}`
    );
    console.log(`REDIS_HOST: ${process.env.REDIS_HOST || 'not set'}`);
    console.log(`REDIS_PORT: ${process.env.REDIS_PORT || 'not set'}`);

    console.log('Creating NestJS worker application...');
    const app = await NestFactory.create(WorkerModule);

    // Optional: listen on port for health checks (e.g. in k8s)
    const port = parseInt(process.env.WORKER_PORT ?? '4001', 10);
    console.log(`Starting worker on port ${port}...`);
    await app.listen(port);
    console.log(`✓ Worker is running on http://localhost:${port}`);
    console.log(`✓ Health check available at: http://localhost:${port}/health`);
  } catch (error) {
    console.error('=== FATAL ERROR during worker bootstrap ===');
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('=== UNHANDLED ERROR in worker bootstrap ===');
  console.error('Error details:', error);
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  process.exit(1);
});
