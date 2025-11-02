# 🚀 Quick Deployment Checklist

## На VPS (один раз)

### 1. Установка зависимостей
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

### 2. База данных
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE aexpo_auth;
CREATE USER aexpo_user WITH PASSWORD 'SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE aexpo_auth TO aexpo_user;
\q
```

### 3. Создание .env
```bash
sudo mkdir -p /var/www/aexpo-auth
sudo chown -R $USER:$USER /var/www/aexpo-auth
nano /var/www/aexpo-auth/.env
```

Скопируйте и заполните:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=aexpo_user
DB_PASSWORD=SECURE_PASSWORD_HERE
DB_NAME=aexpo_auth

JWT_SECRET=RANDOM_32_CHARS_OR_MORE
JWT_EXPIRES_IN=7d

PORT=3000
BASE_URL=http://your-domain.com
NODE_ENV=production
```

### 4. Firewall
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## В GitHub (один раз)

### Settings → Secrets and variables → Actions

**Secrets:**
- `VPS_HOST` = `123.456.789.0`
- `VPS_PASSWORD` = `your_ssh_password`

**Variables:**
- `VPS_USERNAME` = `ubuntu`
- `VPS_PORT` = `22`

**Environment:**
- Создать environment с именем `vps`

## Деплой

### Автоматический
```bash
git push origin master
```

### Ручной
GitHub → Actions → Deploy to VPS (NestJS) → Run workflow

## Проверка

```bash
# На VPS
pm2 status
pm2 logs aexpo-auth
curl http://127.0.0.1:3000
```

## Если что-то пошло не так

```bash
# Логи
pm2 logs aexpo-auth --lines 200
cat /var/www/aexpo-auth/logs/error.log

# Перезапуск
cd /var/www/aexpo-auth
pm2 restart aexpo-auth

# Ручной запуск (для отладки)
node dist/main.js
```

---

📖 **Полная документация:** [DEPLOYMENT.md](./DEPLOYMENT.md)
