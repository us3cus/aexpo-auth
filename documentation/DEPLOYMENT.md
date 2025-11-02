# Deployment Guide

## 🚀 CI/CD с GitHub Actions

Проект настроен для автоматического развертывания на VPS через GitHub Actions.

## Предварительные требования на VPS

### 1. Установка Node.js 22
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Проверка: должно быть v22.x.x
```

### 2. Установка PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Создание базы данных
```bash
sudo -u postgres psql
```

В psql:
```sql
CREATE DATABASE aexpo_auth;
CREATE USER aexpo_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aexpo_auth TO aexpo_user;
\q
```

### 4. Установка PM2
```bash
sudo npm install -g pm2
```

### 5. Создание директории и .env файла
```bash
sudo mkdir -p /var/www/aexpo-auth
sudo chown -R $USER:$USER /var/www/aexpo-auth
cd /var/www/aexpo-auth
```

Создайте файл `.env`:
```bash
nano /var/www/aexpo-auth/.env
```

Содержимое `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=aexpo_user
DB_PASSWORD=your_secure_password
DB_NAME=aexpo_auth

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

# Server
PORT=3000
BASE_URL=http://your-domain.com
NODE_ENV=production
```

**⚠️ ВАЖНО:** 
- Замените `your_secure_password` на реальный пароль
- Замените `JWT_SECRET` на случайную строку минимум 32 символа
- Замените `BASE_URL` на ваш домен

### 6. Настройка Nginx (опционально)
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/aexpo-auth
```

Конфигурация:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активация:
```bash
sudo ln -s /etc/nginx/sites-available/aexpo-auth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## GitHub Secrets/Variables

### Secrets (Settings → Secrets and variables → Actions → New repository secret)
- `VPS_HOST` - IP адрес или домен VPS (например: `123.456.789.0`)
- `VPS_PASSWORD` - Пароль SSH пользователя

### Variables (Settings → Secrets and variables → Actions → Variables)
- `VPS_USERNAME` - Имя пользователя SSH (например: `ubuntu`)
- `VPS_PORT` - SSH порт (по умолчанию: `22`)

### Environment (Settings → Environments → New environment)
Создайте environment с именем `vps` и добавьте туда secrets/variables

## Процесс деплоя

1. **Автоматический деплой**: При push в ветку `master`
2. **Ручной деплой**: Actions → Deploy to VPS (NestJS) → Run workflow

## Workflow выполняет:

1. ✅ Checkout кода
2. ✅ Установка Node.js 22
3. ✅ Установка зависимостей (`npm ci`)
4. ✅ Линтинг (`npm run lint`)
5. ✅ Запуск тестов (`npm run test`)
6. ✅ Сборка проекта (`npm run build`)
7. ✅ Создание архива с dist + node_modules
8. ✅ Копирование на VPS через SCP
9. ✅ Распаковка на VPS
10. ✅ Перезапуск через PM2
11. ✅ Проверка доступности на порту 3000

## PM2 команды

```bash
# Просмотр логов
pm2 logs aexpo-auth

# Статус приложения
pm2 status

# Перезапуск
pm2 restart aexpo-auth

# Остановка
pm2 stop aexpo-auth

# Просмотр метрик
pm2 monit

# Сохранить список процессов
pm2 save

# Автозапуск после перезагрузки
pm2 startup
```

## Отладка проблем

### Приложение не запускается
```bash
# Проверьте логи PM2
pm2 logs aexpo-auth --lines 200

# Проверьте файлы логов
cat /var/www/aexpo-auth/logs/error.log

# Проверьте переменные окружения
cat /var/www/aexpo-auth/.env

# Попробуйте запустить вручную
cd /var/www/aexpo-auth
node dist/main.js
```

### База данных не подключается
```bash
# Проверьте PostgreSQL
sudo systemctl status postgresql

# Проверьте подключение
psql -h localhost -U aexpo_user -d aexpo_auth

# Проверьте pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Должна быть строка: local all all md5
```

### Порт 3000 занят
```bash
# Найти процесс
sudo lsof -i :3000

# Или
sudo netstat -tulpn | grep :3000
```

## Безопасность

1. **Firewall**: Откройте только необходимые порты
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```

2. **SSH**: Рекомендуется использовать SSH ключи вместо паролей
3. **SSL**: Настройте HTTPS через Let's Encrypt
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

4. **Database**: Убедитесь что PostgreSQL доступен только локально

## Мониторинг

```bash
# PM2 мониторинг в реальном времени
pm2 monit

# Логи в реальном времени
pm2 logs aexpo-auth --lines 100

# Использование ресурсов
pm2 status
```

## Rollback

Если деплой прошел неудачно:
```bash
cd /var/www/aexpo-auth
pm2 stop aexpo-auth
# Восстановите из бэкапа или откатите коммит
git checkout <previous-commit>
npm run build
pm2 restart aexpo-auth
```
