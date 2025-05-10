import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Включаем CORS
  app.enableCors();
  
  // Включаем валидацию
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Устанавливаем глобальный префикс для API
  app.setGlobalPrefix('api');

  // Настройка статических файлов
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });

  await app.listen(process.env.PORT ?? 5001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
