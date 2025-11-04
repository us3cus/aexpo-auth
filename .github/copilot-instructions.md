# aexpo-auth Development Guide

## ⚠️ Critical Rules

**DO NOT make git commits.** Never use `git commit`, `git add`, or any git commands that modify the repository history. The developer will handle all version control operations.

## Project Overview
NestJS-based authentication microservice with JWT auth, user profiles, and database-stored avatar management using PostgreSQL.

## Architecture

### Module Structure
- **AuthModule** (`src/auth/`) - Core authentication with JWT + Passport strategies
- **UploadModule** (`src/upload/`) - Avatar upload with automatic WebP compression via Sharp
- **UsersModule** (`src/users/`) - User profile management

### Key Patterns

**Authentication Flow:**
1. `LocalStrategy` validates email/password on login → returns user object
2. `JwtStrategy` validates Bearer token → extracts user from `payload.sub` (user ID) and `payload.email`
3. Guards: Use `@UseGuards(LocalAuthGuard)` for login, `@UseGuards(JwtAuthGuard)` for protected routes
4. User context: Access via `@Req() req` → `req.user` contains `{ id, email }`

**Avatar Storage:**
- Avatars stored as `bytea` in PostgreSQL (not file system)
- All images auto-compressed: resized to max 800×800, converted to WebP at 80% quality
- Upload: `POST /api/v1/upload/avatar` with `multipart/form-data` → stored in `users.avatarData`
- Retrieve: `GET /api/v1/upload/avatar/:userId` → serves binary with 1-year cache headers
- Sharp library handles compression in `UploadService.compressImage()`

**Database:**
- TypeORM with `synchronize: true` (development only - **critical**: disable in production)
- User entity in `src/auth/entities/user.entity.ts` with password hashing via bcrypt (10 rounds)
- No migrations folder - schema auto-synced from entities

**Validation:**
- Global `ValidationPipe` with `whitelist: true, transform: true` in `main.ts`
- DTOs use `class-validator` decorators (e.g., `@MinLength(6)` for passwords, `@IsEmail()`)
- Password: min 6 chars | Names: min 2 chars | Email: valid format

## Environment Variables
Required in `.env` (via `@nestjs/config`):
```env
# Database
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME

# JWT
JWT_SECRET (required - app throws error if missing)
JWT_EXPIRES_IN (optional - no expiration if omitted)

# Server
PORT (default: 5000)
BASE_URL (default: http://localhost:5001) - for avatar URLs
```

## Development Workflow

**Start dev server:**
```bash
npm run start:dev  # Watch mode with auto-reload
```

**API versioning:**
- Global prefix: `api/v1` (set in `main.ts`)
- Controllers define paths relative to prefix: `@Controller('auth')` → `/api/v1/auth`

**Testing:**
```bash
npm run test          # Unit tests (Jest)
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report
```

**Linting:**
```bash
npm run lint          # ESLint with auto-fix
npm run format        # Prettier
```

## Common Tasks

**Add new protected endpoint:**
1. Add `@UseGuards(JwtAuthGuard)` to controller method
2. Access user: `@Req() req` → `req.user.id`, `req.user.email`
3. User object shape: `{ id: number, email: string }`

**Modify User entity:**
1. Edit `src/auth/entities/user.entity.ts`
2. TypeORM auto-syncs on restart (dev mode)
3. Production: Create proper migrations before disabling `synchronize`

**Add validation to DTO:**
- Use `class-validator` decorators: `@IsString()`, `@MinLength()`, `@IsOptional()`, etc.
- Error messages auto-generated (Russian used in some services - consider i18n)

**Handling avatars:**
- Never manually delete `users.avatarData` - use `AuthService.updateAvatar()`
- Avatar MIME type stored in `users.avatarMimeType` (always 'image/webp' after compression)
- Old `avatarUrl` field exists for backwards compat but unused in new uploads

## Dependencies

**Core:**
- NestJS 11 (controllers, services, modules pattern)
- TypeORM 0.3 with PostgreSQL driver
- Passport (JWT + Local strategies)

**Image Processing:**
- Sharp for WebP compression (critical for avatar uploads)
- Multer with `memoryStorage()` (no disk writes)

**Validation:**
- `class-validator` + `class-transformer` for DTO validation

## Known Issues & Gotchas

1. **TypeORM synchronize:** Currently `true` - **must disable in production** and use migrations
2. **Russian error messages:** Some validation errors in Russian (see `AuthService.register()`)
3. **No password recovery:** Not implemented yet
4. **Avatar migration:** Old avatars in `public/avatars/` folder are orphaned (see `AVATAR_MIGRATION.md`)
5. **CORS:** Enabled globally with `app.enableCors()` - configure origins for production

## Documentation Structure

All project documentation is stored in the `documentation/` folder. **Always read relevant documentation before working on related tasks.**

### Documentation Files & When to Read Them

| File | Read When Working On | Contains |
|------|---------------------|----------|
| `documentation/API.md` | API endpoints, testing, curl examples | Complete API reference with request/response examples |
| `documentation/CI_CD_SETUP.md` | Deployment, CI/CD, GitHub Actions | Overview of CI/CD setup and quick start guide |
| `documentation/DEPLOYMENT.md` | VPS setup, production deployment, troubleshooting | Complete deployment guide with VPS setup, PM2, PostgreSQL |
| `documentation/DEPLOYMENT_CHECKLIST.md` | Quick deployment reference | Step-by-step checklist for deployment |
| `documentation/ENV_VARIABLES.md` | Environment variables, configuration | All environment variables with descriptions and examples |
| `documentation/NGINX_SETUP.md` | Nginx, reverse proxy, SSL/HTTPS | Nginx configuration and Let's Encrypt SSL setup |
| `documentation/SECURITY_FIXES.md` | Security, vulnerabilities, best practices | Security patches and recommendations |
| `documentation/DEPENDENCIES_AUDIT.md` | Dependencies, npm warnings, updates | Dependency analysis and update recommendations |
| `documentation/README.md` | Documentation index | Complete documentation structure and guidelines |

### Auto-Read Rules

**Before making changes, read:**
- **Deployment/CI/CD tasks** → `documentation/DEPLOYMENT.md`, `documentation/CI_CD_SETUP.md`
- **API modifications** → `documentation/API.md`
- **Environment setup** → `documentation/ENV_VARIABLES.md`
- **Security updates** → `documentation/SECURITY_FIXES.md`
- **Nginx/proxy changes** → `documentation/NGINX_SETUP.md`
- **Dependencies/npm updates** → `documentation/DEPENDENCIES_AUDIT.md`
- **Documentation questions** → `documentation/README.md`

**When creating new documentation:**
- ✅ Place all `.md` files (except root `README.md`) in `documentation/` folder
- ✅ Update the table above with new documentation
- ✅ Update `documentation/README.md` with new file info
- ✅ Use clear, descriptive filenames in UPPERCASE with underscores (e.g., `MY_FEATURE.md`)
- ✅ Use relative links within documentation: `./OTHER_DOC.md` for same folder, `../file.ext` for root

**Link structure examples:**
```markdown
# Inside documentation/ files
[Other doc](./API.md)           # Same folder
[Root file](../manage.sh)       # Root of project

# Inside root README.md
[Documentation](./documentation/DEPLOYMENT.md)
```

## File References

- Auth config: `src/auth/auth.module.ts` (JWT registration)
- Main app config: `src/app.module.ts` (TypeORM + global ConfigModule)
- Bootstrap: `src/main.ts` (global pipes, CORS, API prefix)
- PM2 config: `ecosystem.config.js` (production process management)
- Management script: `manage.sh` (VPS management utilities)
