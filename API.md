# REST API Документация

## Аутентификация

### Регистрация нового пользователя
```http
POST /api/v1/auth/register
```

#### Пример curl запроса
```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "Иван",
    "lastName": "Иванов"
  }'
```

#### Тело запроса
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "Иван",
  "lastName": "Иванов"
}
```

#### Ответ
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "createdAt": "2024-03-21T12:00:00.000Z",
  "updatedAt": "2024-03-21T12:00:00.000Z"
}
```

#### Ошибки
- `409 Conflict` - Пользователь с таким email уже существует
- `400 Bad Request` - Невалидные данные (некорректный email, короткий пароль, короткое имя или фамилия)

### Вход в систему
```http
POST /api/v1/auth/login
```

#### Пример curl запроса
```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Тело запроса
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Ответ
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Ошибки
- `401 Unauthorized` - Неверные учетные данные

### Получение профиля пользователя
```http
GET /api/v1/auth/profile
```

#### Пример curl запроса
```bash
curl -X GET http://localhost:5001/api/v1/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Заголовки
```
Authorization: Bearer <access_token>
```

#### Ответ
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
  "createdAt": "2024-03-21T12:00:00.000Z",
  "updatedAt": "2024-03-21T12:00:00.000Z"
}
```

**Примечание:** Для получения аватара используйте эндпоинт `GET /api/v1/upload/avatar/:userId`. Аватары хранятся в базе данных в сжатом формате WebP.

#### Ошибки
- `401 Unauthorized` - Отсутствует или недействительный токен

### Обновление профиля пользователя
```http
PATCH /api/v1/auth/profile
```

#### Пример curl запроса
```bash
curl -X PATCH http://localhost:5001/api/v1/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "password": "newpassword123",
    "firstName": "Петр",
    "lastName": "Петров"
  }'
```

#### Заголовки
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Тело запроса
```json
{
  "password": "newpassword123",
  "firstName": "Петр",
  "lastName": "Петров"
}
```

Все поля являются опциональными. Обновляются только те поля, которые были переданы в запросе.

#### Ответ
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "Петр",
  "lastName": "Петров",
  "createdAt": "2024-03-21T12:00:00.000Z",
  "updatedAt": "2024-03-21T12:00:00.000Z"
}
```

**Примечание:** Для работы с аватаром используйте эндпоинты `/api/v1/upload/avatar`.

#### Ошибки
- `401 Unauthorized` - Отсутствует или недействительный токен
- `400 Bad Request` - Невалидные данные (короткий пароль, короткое имя или фамилия)
- `404 Not Found` - Пользователь не найден

## Загрузка файлов

### Загрузка аватара

**POST** `/api/v1/upload/avatar`

Загружает аватар пользователя, сжимает его в формат WebP и сохраняет в базе данных PostgreSQL. Изображение автоматически сжимается до максимального размера 800x800 пикселей с сохранением пропорций.

**Заголовки:**
- `Authorization: Bearer <token>` - JWT токен авторизации
- `Content-Type: multipart/form-data`

**Параметры:**
- `file` - файл изображения (jpg, jpeg, png, gif, webp). Максимальный размер: 10MB

**Пример curl запроса:**
```bash
curl -X POST http://localhost:5001/api/v1/upload/avatar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/avatar.jpg"
```

**Ответ:**
```json
{
    "message": "Avatar uploaded successfully",
    "size": 45678,
    "originalSize": 123456,
    "compressionRatio": "63.01"
}
```

**Ошибки:**
- `401 Unauthorized` - если токен не предоставлен или недействителен
- `400 Bad Request` - если файл не предоставлен или имеет неверный формат

### Получение аватара пользователя

**GET** `/api/v1/upload/avatar/:userId`

Возвращает аватар пользователя в формате WebP из базы данных.

**Параметры:**
- `userId` - ID пользователя (число)

**Пример curl запроса:**
```bash
curl -X GET http://localhost:5001/api/v1/upload/avatar/1 \
  --output avatar.webp
```

**Ответ:**
- Бинарные данные изображения в формате WebP
- Заголовки:
  - `Content-Type: image/webp`
  - `Content-Length: <размер в байтах>`
  - `Cache-Control: public, max-age=31536000`

**Ошибки:**
- `404 Not Found` - если аватар не найден для указанного пользователя
- `400 Bad Request` - если userId не является числом

## Общие замечания

### Формат ошибок
Все ошибки возвращаются в следующем формате:
```json
{
  "statusCode": 400,
  "message": "Описание ошибки",
  "error": "Тип ошибки"
}
```

### Аутентификация
Для защищенных эндпоинтов необходимо передавать JWT токен в заголовке:
```
Authorization: Bearer <access_token>
```

### Валидация
- Email должен быть валидным адресом электронной почты
- Пароль должен содержать минимум 6 символов
- Имя и фамилия должны содержать минимум 2 символа 