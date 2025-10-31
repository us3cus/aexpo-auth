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
  "avatarUrl": "http://localhost:3000/avatars/123e4567-e89b-12d3-a456-426614174000.jpg",
  "createdAt": "2024-03-21T12:00:00.000Z",
  "updatedAt": "2024-03-21T12:00:00.000Z"
}
```

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
  "avatarUrl": "http://localhost:3000/avatars/123e4567-e89b-12d3-a456-426614174000.jpg",
  "createdAt": "2024-03-21T12:00:00.000Z",
  "updatedAt": "2024-03-21T12:00:00.000Z"
}
```

#### Ошибки
- `401 Unauthorized` - Отсутствует или недействительный токен
- `400 Bad Request` - Невалидные данные (короткий пароль, короткое имя или фамилия)
- `404 Not Found` - Пользователь не найден

## Загрузка файлов

### Загрузка аватара

**POST** `/api/v1/upload/avatar`

Загружает аватар пользователя и обновляет URL в профиле.

**Заголовки:**
- `Authorization: Bearer <token>` - JWT токен авторизации
- `Content-Type: multipart/form-data`

**Параметры:**
- `file` - файл изображения (jpg, jpeg, png, gif)

**Ответ:**
```json
{
    "filename": "7b6f3bd9-e0a5-46d5-8dd9-e510e3946b8e.png",
    "url": "http://localhost:3000/avatars/7b6f3bd9-e0a5-46d5-8dd9-e510e3946b8e.png"
}
```

**Ошибки:**
- `401 Unauthorized` - если токен не предоставлен или недействителен
- `400 Bad Request` - если файл не предоставлен или имеет неверный формат

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