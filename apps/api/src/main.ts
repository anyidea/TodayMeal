import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApiApplication } from './configure-api-application';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApiApplication(app);
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();
