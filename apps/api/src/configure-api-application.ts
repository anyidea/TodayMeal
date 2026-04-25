import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import path from 'node:path';

export function configureApiApplication(app: NestExpressApplication): void {
  app.enableCors();
  app.useStaticAssets(path.resolve(process.env.UPLOAD_DIR ?? './uploads'), {
    prefix: '/uploads/',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}
