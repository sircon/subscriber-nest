import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(WorkerModule);

    // Optional: listen on port for health checks (e.g. in k8s)
    const port = parseInt(process.env.WORKER_PORT ?? '4001', 10);
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
