# 🚀 CI/CD Setup Complete!

CI/CD конфигурация для **aexpo-auth** успешно создана и готова к использованию.

## 📦 Что было создано

### 1. GitHub Actions Workflow
**Файл**: `.github/workflows/deploy.yml`
- ✅ Автоматический деплой при push в `master`
- ✅ Возможность ручного запуска
- ✅ Линтинг и тесты перед деплоем
- ✅ Сборка проекта
- ✅ Деплой на VPS через SCP
- ✅ Автоматический перезапуск через PM2
- ✅ Health check после деплоя

### 2. PM2 Configuration
**Файл**: `ecosystem.config.js`
- ✅ Настройка для production
- ✅ Cluster mode
- ✅ Auto-restart
- ✅ Логирование
- ✅ Memory limit (500MB)

### 3. Документация

| Файл | Описание |
|------|----------|
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | 📖 Полное руководство по деплою |
| **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** | ✅ Быстрый чеклист |
| **[NGINX_SETUP.md](./NGINX_SETUP.md)** | 🔒 Настройка Nginx + SSL |
| **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** | 🔐 Описание переменных окружения |
| **[../manage.sh](../manage.sh)** | 🛠️ Скрипт управления на VPS |

### 4. Обновленные файлы
- ✅ `README.md` - добавлена секция Deployment
- ✅ `.gitignore` - добавлено игнорирование PM2 логов

## 🎯 Следующие шаги

### На VPS (выполнить один раз)

#### 1. Установить зависимости
```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# PM2
sudo npm install -g pm2

# Nginx (опционально)
sudo apt install nginx
```

#### 2. Создать базу данных
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE aexpo_auth;
CREATE USER aexpo_user WITH PASSWORD 'SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE aexpo_auth TO aexpo_user;
\q
```

#### 3. Создать .env файл
```bash
sudo mkdir -p /var/www/aexpo-auth
sudo chown -R $USER:$USER /var/www/aexpo-auth
nano /var/www/aexpo-auth/.env
```

Скопируйте и заполните (см. [ENV_VARIABLES.md](./ENV_VARIABLES.md)):
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=aexpo_user
DB_PASSWORD=SECURE_PASSWORD
DB_NAME=aexpo_auth

JWT_SECRET=RANDOM_32_CHARS_OR_MORE
JWT_EXPIRES_IN=7d

PORT=5000
BASE_URL=http://your-domain.com
NODE_ENV=production
```

**Генерация JWT_SECRET:**
```bash
openssl rand -base64 48
```

#### 4. Настроить firewall
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### В GitHub (выполнить один раз)

#### Settings → Secrets and variables → Actions

**Secrets:**
- `VPS_HOST` = IP адрес VPS (например: `123.456.789.0`)
- `VPS_PASSWORD` = SSH пароль

**Variables:**
- `VPS_USERNAME` = SSH пользователь (например: `ubuntu`)
- `VPS_PORT` = SSH порт (обычно `22`)

**Environment:**
- Создать environment с именем `vps`

## 🔄 Использование

### Автоматический деплой
```bash
git add .
git commit -m "Your changes"
git push origin master
```
→ Деплой запустится автоматически

### Ручной деплой
1. Перейти в **GitHub** → **Actions**
2. Выбрать **Deploy to VPS (NestJS)**
3. Нажать **Run workflow**
4. Выбрать ветку `master`
5. Нажать **Run workflow**

## 🛠️ Управление на VPS

### Через скрипт manage.sh
```bash
# Сделать исполняемым
chmod +x manage.sh

# Запустить
./manage.sh
```

Доступные опции:
- 1️⃣ Статус приложения
- 2️⃣ Логи в реальном времени
- 3️⃣ Последние 100 строк логов
- 4️⃣ Перезапуск
- 5️⃣ Остановка
- 6️⃣ Запуск
- 7️⃣ Информация о приложении
- 8️⃣ Переменные окружения
- 9️⃣ Бэкап базы данных
- 🔟 Health check

### Через PM2 напрямую
```bash
pm2 status              # Статус
pm2 logs aexpo-auth     # Логи
pm2 restart aexpo-auth  # Перезапуск
pm2 stop aexpo-auth     # Остановка
pm2 start aexpo-auth    # Запуск
pm2 monit               # Мониторинг
```

## 🔒 Nginx + SSL (опционально, но рекомендуется)

Для HTTPS см. **[NGINX_SETUP.md](./NGINX_SETUP.md)**

Быстрая установка SSL:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## ✅ Проверка работоспособности

После деплоя:

```bash
# На VPS
pm2 status
pm2 logs aexpo-auth
curl http://127.0.0.1:5000

# Или через скрипт
./manage.sh
# Выбрать опцию 10 (Health check)
```

## 🐛 Отладка проблем

### Приложение не запускается
```bash
pm2 logs aexpo-auth --lines 200
cat /var/www/aexpo-auth/logs/error.log
```

### База данных не подключается
```bash
sudo systemctl status postgresql
psql -h localhost -U aexpo_user -d aexpo_auth
```

### 502 Bad Gateway (через Nginx)
```bash
pm2 status
sudo netstat -tulpn | grep 5000
sudo tail -f /var/log/nginx/aexpo-auth_error.log
```

### GitHub Actions failed
1. Проверить **Actions** → последний workflow
2. Посмотреть логи failed step
3. Проверить secrets/variables в GitHub
4. Проверить SSH доступ к VPS

## 📊 Мониторинг

### Логи в реальном времени
```bash
pm2 logs aexpo-auth
```

### Метрики
```bash
pm2 monit
```

### Бэкап базы данных
```bash
./manage.sh
# Выбрать опцию 9
```

Или вручную:
```bash
cd /var/www/aexpo-auth
mkdir -p backups
pg_dump -h localhost -U aexpo_user aexpo_auth > backups/backup_$(date +%Y%m%d).sql
gzip backups/backup_$(date +%Y%m%d).sql
```

## 🔐 Безопасность

### ⚠️ ВАЖНО перед production:

1. **Сильный JWT_SECRET**: минимум 32 случайных символа
2. **Сильный пароль БД**: не используйте стандартные пароли
3. **Firewall**: Открыты только нужные порты (22, 80, 443)
4. **SSL/HTTPS**: Обязательно для production
5. **SSH ключи**: Вместо паролей (рекомендуется)
6. **TypeORM synchronize**: Отключить в production, использовать миграции
7. **Ограничение доступа к БД**: PostgreSQL только localhost

## 📚 Полезные ссылки

- [NestJS Deployment](https://docs.nestjs.com/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Let's Encrypt](https://letsencrypt.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🆘 Получение помощи

Если возникли проблемы:

1. Проверьте **[DEPLOYMENT.md](./DEPLOYMENT.md)** - раздел "Отладка проблем"
2. Проверьте логи: `pm2 logs aexpo-auth --lines 200`
3. Запустите health check: `./manage.sh` → опция 10
4. Проверьте переменные окружения: `cat /var/www/aexpo-auth/.env`

---

✨ **Готово!** Теперь ваш проект готов к автоматическому деплою на VPS.
