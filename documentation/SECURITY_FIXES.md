# Исправления безопасности

## ✅ Реализованные улучшения

### 1. Защита от утечки паролей
- **Добавлен** `@Exclude()` декоратор на поле `User.password`
- **Настроен** `ClassSerializerInterceptor` глобально
- **Удалена** ручная санитизация в `PostsService` (теперь автоматически)

### 2. Валидация файлов (Magic Bytes)
- **Создан** `FileValidationService` с проверкой magic bytes через `file-type`
- **Проверка** соответствия заявленного и реального MIME-типа
- **Ограничения** размеров:
  - Изображения: макс 10MB
  - Видео: макс 50MB
- **Белый список** форматов:
  - Изображения: JPEG, PNG, GIF, WebP
  - Видео: MP4, QuickTime, WebM

### 3. Установлены зависимости
- ✅ `file-type@16` - для проверки magic bytes
- ✅ `@nestjs/throttler` - для rate limiting (требует настройки)
- ✅ `class-transformer` - для сериализации
- ✅ `sharp` обновлен до последней версии

## 🔄 Требуется дополнительная настройка

### 1. Интеграция FileValidationService
Необходимо добавить в `PostsService` и `UploadService`:

```typescript
constructor(
  private fileValidationService: FileValidationService,
  // ...
) {}

async create(..., file) {
  if (file) {
    // Валидация перед обработкой
    await this.fileValidationService.validateAndThrow(
      file.buffer,
      file.mimetype
    );
    // ... остальная логика
  }
}
```

### 2. Rate Limiting
Добавить в `app.module.ts`:

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 минута
      limit: 10,  // 10 запросов
    }]),
    // ...
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
```

### 3. Фильтрация по Privacy
Обновить `PostsService.findAll()`:

```typescript
async findAll(currentUserId?: number): Promise<Post[]> {
  const query = this.postsRepository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.user', 'user')
    .where('post.privacy = :privacy', { privacy: PostPrivacy.PUBLIC });
  
  if (currentUserId) {
    query.orWhere('post.userId = :userId', { userId: currentUserId });
  }
  
  return await query
    .orderBy('post.createdAt', 'DESC')
    .getMany();
}
```

### 4. Транзакции для целостности
Обернуть операции с S3 и БД:

```typescript
async update(...) {
  return await this.connection.transaction(async (manager) => {
    const post = await manager.findOne(Post, { where: { id } });
    
    if (file && post.mediaUrl) {
      await this.s3Service.deleteFile(post.mediaUrl);
    }
    
    // ... обновление
    return await manager.save(post);
  });
}
```

### 5. Global Exception Filter
Создать `src/common/http-exception.filter.ts`:

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## 📋 Чеклист безопасности

- [x] Пароли скрыты через `@Exclude()`
- [x] Magic bytes валидация создана
- [ ] Magic bytes интегрирована в upload endpoints
- [x] Установлен `@nestjs/throttler`
- [ ] Rate limiting настроен
- [ ] Privacy фильтрация в findAll
- [ ] Транзакции для критических операций
- [ ] Global Exception Filter
- [x] Зависимости обновлены
- [ ] CSRF protection (если используются cookies)
- [ ] Input validation расширена (ограничения длины)

## 🚨 Критично для production

1. **Обязательно настройте rate limiting** - защита от DoS
2. **Интегрируйте FileValidationService** - защита от загрузки вредоносных файлов
3. **Добавьте privacy фильтрацию** - защита приватных данных
4. **Используйте транзакции** - целостность данных при сбоях
5. **Запустите** `npm audit fix` - исправить известные уязвимости

## Дальнейшие улучшения

- Логирование всех загрузок файлов
- Антивирусное сканирование загруженных файлов
- IP whitelist/blacklist
- Content Security Policy headers
- Helmet.js для дополнительных заголовков безопасности
