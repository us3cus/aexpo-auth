# Environment Variables Reference

## Required Variables

### Database Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | PostgreSQL host address | `localhost` | ✅ Yes |
| `DB_PORT` | PostgreSQL port | `5432` | ✅ Yes |
| `DB_USERNAME` | Database username | `aexpo_user` | ✅ Yes |
| `DB_PASSWORD` | Database password | `secure_password_123` | ✅ Yes |
| `DB_NAME` | Database name | `aexpo_auth` | ✅ Yes |

### JWT Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | `super-secret-jwt-key-change-in-production` | ✅ Yes |
| `JWT_EXPIRES_IN` | Token expiration time | `7d`, `24h`, `30d` | ❌ No (eternal if omitted) |

### Server Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | ❌ No (default: 3000) |
| `BASE_URL` | Base URL for avatar links | `https://api.example.com` | ❌ No (default: http://localhost:5001) |
| `NODE_ENV` | Environment mode | `production`, `development` | ❌ No |

## Development .env Example

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=aexpo_auth

# JWT
JWT_SECRET=dev-secret-key-change-this-min-32-chars
JWT_EXPIRES_IN=7d

# Server
PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=development
```

## Production .env Example

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=aexpo_user
DB_PASSWORD=SECURE_RANDOM_PASSWORD_HERE
DB_NAME=aexpo_auth

# JWT - CRITICAL: Use strong random string
JWT_SECRET=RANDOM_STRING_MIN_32_CHARS_NEVER_SHARE
JWT_EXPIRES_IN=7d

# Server
PORT=3000
BASE_URL=https://your-domain.com
NODE_ENV=production
```

## Security Best Practices

### 1. JWT_SECRET
- **Minimum length**: 32 characters
- **Use random string**: `openssl rand -base64 32`
- **Never commit**: Always in `.gitignore`
- **Rotate regularly**: Change periodically in production
- **App will fail**: If not set (throws error on startup)

### 2. Database Password
- **Strong password**: Mix of letters, numbers, symbols
- **Never use defaults**: Don't use 'postgres', 'password', etc.
- **Different per environment**: Dev, staging, prod should differ

### 3. Environment Files
- **Never commit `.env`**: Always in `.gitignore`
- **Use `.env.example`**: Template without sensitive data
- **VPS location**: Store in `/var/www/aexpo-auth/.env`
- **Restrict permissions**: `chmod 600 .env`

## Generating Secure Values

### JWT Secret
```bash
# Option 1: OpenSSL (recommended)
openssl rand -base64 48

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Password generator
pwgen -s 64 1
```

### Database Password
```bash
# Generate strong password
openssl rand -base64 24
```

## Common Issues

### "JWT_SECRET is required"
**Problem**: App throws error on startup  
**Solution**: Add `JWT_SECRET` to `.env` file

### Database connection failed
**Problem**: Cannot connect to PostgreSQL  
**Solution**: 
- Verify `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Test connection: `psql -h localhost -U aexpo_user -d aexpo_auth`

### Avatar URLs incorrect
**Problem**: Avatar links point to wrong domain  
**Solution**: Set correct `BASE_URL` in `.env`

### Token expires too quickly/never expires
**Problem**: JWT behavior unexpected  
**Solution**: Set `JWT_EXPIRES_IN` (e.g., `7d`, `24h`) or omit for eternal tokens

## Environment-Specific Notes

### Development
- Can use weak secrets (but never commit them)
- Use `localhost` for `DB_HOST` and `BASE_URL`
- `NODE_ENV=development` enables extra logging

### Production
- **MUST** use strong random secrets
- Set `NODE_ENV=production`
- Use HTTPS for `BASE_URL`
- **CRITICAL**: Disable `synchronize: true` in TypeORM (add migrations)

## Validation on Startup

The app validates:
1. ✅ `JWT_SECRET` exists (throws error if missing)
2. ✅ Database credentials valid (connects on startup)
3. ✅ Port not in use

## Updating Variables

### Development
1. Edit `.env` file
2. Restart server: `npm run start:dev`

### Production (VPS)
1. SSH to server
2. Edit `.env`: `nano /var/www/aexpo-auth/.env`
3. Restart app: `pm2 restart aexpo-auth`
4. Verify: `pm2 logs aexpo-auth`

## Backup Recommendations

- **Never backup `.env` to public repos**
- Store production secrets in password manager
- Document non-sensitive defaults in `.env.example`
- Keep encrypted backup of production `.env`
