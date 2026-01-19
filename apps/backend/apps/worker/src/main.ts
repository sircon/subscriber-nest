import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule);

  // Optional: listen on port for health checks (e.g. in k8s)
  const port = parseInt(process.env.WORKER_PORT ?? '4001', 10);
  await app.listen(port);
  console.log(`Worker is running on http://localhost:${port}`);
}

bootstrap();
