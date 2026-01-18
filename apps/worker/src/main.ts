import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Worker service doesn't need HTTP server - it processes jobs and runs cron jobs
  // No app.listen() call - just bootstrap the application

  console.log("Worker service started successfully");
  console.log(
    "Processing jobs from queues: subscriber-sync, billing, account-deletion",
  );
}

bootstrap();
