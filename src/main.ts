import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });
  
  // Включаем CORS
  app.enableCors();
  
  // Включаем валидацию
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Устанавливаем глобальный префикс для API
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 5001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
