# REST API Документация

## Аутентификация

### Регистрация нового пользователя
```http
POST /api/auth/register
```

#### Пример curl запроса
```bash
curl -X POST http://localhost:5001/api/auth/register \
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
POST /api/auth/login
```

#### Пример curl запроса
```bash
curl -X POST http://localhost:5001/api/auth/login \
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
GET /api/auth/profile
```

#### Пример curl запроса
```bash
curl -X GET http://localhost:5001/api/auth/profile \
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

#### Ошибки
- `401 Unauthorized` - Отсутствует или недействительный токен

## Интеграция с Shikimori

### Начало процесса авторизации через Shikimori
```http
GET /api/auth/shikimori/login
```

#### Пример curl запроса
```bash
curl -X GET http://localhost:5001/api/auth/shikimori/login
```

#### Ответ
Перенаправление на страницу авторизации Shikimori

### Callback от Shikimori
```http
GET /api/auth/shikimori/callback
```

#### Пример curl запроса
```bash
curl -X GET "http://localhost:5001/api/auth/shikimori/callback?code=YOUR_AUTH_CODE"
```

#### Параметры запроса
- `code` - Код авторизации от Shikimori

#### Ответ
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Ошибки
- `400 Bad Request` - Отсутствует код авторизации
- `401 Unauthorized` - Ошибка при обмене кода на токен

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