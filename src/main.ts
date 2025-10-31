import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get ConfigService to access environment variables
  const configService = app.get(ConfigService);

  // Включаем CORS
  app.enableCors();

  // Включаем валидацию
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Устанавливаем глобальный префикс для API
  app.setGlobalPrefix('api/v1');

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

void bootstrap();
