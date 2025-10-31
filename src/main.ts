import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  // Настройка статических файлов
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
