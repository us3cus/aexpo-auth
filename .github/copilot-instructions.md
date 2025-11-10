# aexpo-auth Development Guide

## ⚠️ Critical Rules

**DO NOT make git commits.** Never use `git commit`, `git add`, or any git commands that modify the repository history. The developer will handle all version control operations.

## Project Overview
NestJS-based authentication microservice with JWT auth, user profiles, social posts with media storage, and dual storage strategy (PostgreSQL for avatars, S3 for posts).

## Architecture

### Module Structure
- **AuthModule** (`src/auth/`) - Core authentication with JWT + Passport strategies
- **UploadModule** (`src/upload/`) - Avatar upload with database storage (PostgreSQL bytea) + WebP compression
- **UsersModule** (`src/users/`) - User profile management
- **PostsModule** (`src/posts/`) - Social posts with media, privacy levels, hashtags
- **S3Module** (`src/s3/`) - S3-compatible storage (Garage) for post media
- **Common** (`src/common/`) - Shared services like file validation with magic byte detection

### Key Patterns

**Authentication Flow:**
1. `LocalStrategy` validates email/password on login → returns user object
2. `JwtStrategy` validates Bearer token → extracts user from `payload.sub` (user ID) and `payload.email`
3. Guards: Use `@UseGuards(LocalAuthGuard)` for login, `@UseGuards(JwtAuthGuard)` for protected routes
4. User context: Access via `@Req() req` → `req.user` contains `{ id, email }`

**Storage Strategy - All files in S3:**
- **Avatars** → S3-compatible storage (Garage), only URL stored in PostgreSQL (`users.avatarUrl`)
  - Max 800×800px, WebP @ 80% quality via Sharp
  - Upload: `POST /api/v1/upload/avatar` → compresses → uploads to S3 → stores URL in DB
  - Retrieve URL: `GET /api/v1/upload/avatar/:userId` → returns `{ avatarUrl, avatarMimeType }`
  - Direct access via S3 public URL
- **Post Media** → S3-compatible storage (Garage) with CDN
  - Max 1200×1200px for images, WebP @ 80% quality
  - Upload via `S3Service.uploadFile()` with UUID filenames
  - Public URLs: `{S3_PUBLIC_URL}/{S3_BUCKET}/{folder}/{uuid}.{ext}`
  - Videos stored uncompressed (mp4, mov, webm supported)

**Media File Validation:**
- Uses `file-type` library for magic byte detection (not just MIME type checking)
- `FileValidationService` enforces: images 10MB max, videos 50MB max
- Validates declared MIME matches actual file signature to prevent spoofing
- Allowed types explicitly whitelisted (no user-controlled extensions)

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

# S3 Storage (for posts media only)
S3_ENDPOINT (e.g., https://s3.garage.example.com)
S3_REGION (default: 'garage')
S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET
S3_PUBLIC_URL (CDN endpoint for public access)
```
See `documentation/ENV_VARIABLES.md` for full reference with examples.

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
- Use `class-validator` decorators: `@IsString()`, `@MinLength()`, `@IsOptional()`, `@ValidateIf()`, etc.
- Error messages in Russian (consider i18n for multi-language support)
- **Hashtags validation**: `@ArrayMaxSize(10)`, `@Matches(/^#[a-zA-Zа-яА-ЯёЁ0-9_]+$/)`
  - Max 10 hashtags per post, must start with #, only letters/numbers/_
- **Conditional validation**: Use `@ValidateIf()` for fields required only in specific cases
  - Example: `currentPassword` required only when `password` is provided (UpdateProfileDto)

**File upload validation (two-tier security):**
- **Tier 1 - Controller:** Multer `fileFilter` validates MIME type + extension before memory
  - Posts: 50MB limit, allows images (jpeg, png, gif, webp) + videos (mp4, mov, avi, webm)
  - Avatars: **5MB limit** (in `upload.config.ts`), images only
- **Tier 2 - Service:** `FileValidationService` validates via magic bytes (file signature)
  - Used in `UploadController.uploadAvatar()` → `validateAndThrow(buffer, mimeType)`
  - Prevents MIME spoofing (e.g., `.exe` renamed to `.jpg`)
  - Verifies actual file type matches declared MIME type using `file-type` library

**Handling media files:**
- **Avatars**: Use `AuthService.updateAvatar()` for uploads (auto-deletes old file from S3)
  - Avatar MIME type stored in `users.avatarMimeType` (always 'image/webp' after compression)
  - `users.avatarUrl` contains full S3 public URL
  - Get avatar URL via `GET /api/v1/upload/avatar/:userId` (lightweight, no full user profile)
- **Post Media**: Deletion managed by `S3Service.deleteFile()` 
  - Always delete S3 file before removing post entity (see `PostsService.remove()`)
  - S3 URLs parsed from `{publicUrl}/{bucket}/{key}` format
  - Failed S3 deletions logged (via Logger) but don't block DB operations

**Why S3-compatible Garage storage:**
- Self-hosted alternative to AWS S3, reducing cloud costs while maintaining S3 API compatibility
- Full control over data sovereignty and storage location
- `forcePathStyle: true` required in S3Client config (path-style vs virtual-hosted-style URLs)
- Works with CDN overlay for public URL serving (`S3_PUBLIC_URL` vs internal `S3_ENDPOINT`)

**API Response patterns:**
- **User entities**: Password auto-excluded via `@Exclude()` decorator + `ClassSerializerInterceptor` (in `main.ts`)
  - No manual field mapping needed - just return entity
  - Applies to: `AuthService.register()`, `AuthService.updateProfile()`, user endpoints
- **Post responses**: Include user data but sanitized via `sanitizePost()` method
- **Pagination**: All list endpoints return `{ items[], total, page, totalPages }`
  - Example: `GET /api/v1/posts?page=1&limit=20` (max 50 per request)

## Dependencies

**Core:**
- NestJS 11 (controllers, services, modules pattern)
- TypeORM 0.3 with PostgreSQL driver
- Passport (JWT + Local strategies)

**Storage:**
- Sharp for WebP compression (avatars 800×800, post images 1200×1200)
- Multer with `memoryStorage()` (no disk writes)
- AWS SDK v3 (`@aws-sdk/client-s3`) for S3-compatible storage (Garage)

**Validation & Security:**
- `class-validator` + `class-transformer` for DTO validation with conditional rules
- `file-type` v16 for magic byte validation (prevents MIME spoofing attacks)
- `bcrypt` for password hashing (10 rounds)

**Logging:**
- NestJS `Logger` service used throughout (not `console.log`)
- Example: `S3Service` logs uploads/deletions with contextual info
- Log levels: `.log()` (info), `.debug()` (details), `.error()` (with stack traces)

## Known Issues & Gotchas

1. **TypeORM synchronize:** Currently `true` - **must disable in production** and use migrations
2. **Russian error messages:** Validation errors in Russian (consider i18n implementation)
3. **No password recovery:** Not implemented yet
4. **S3 forcePathStyle:** Required for Garage S3 compatibility (see `S3Service` constructor)
5. **Post privacy levels:** `PostPrivacy` enum defines `public`, `friends`, `private` - friends system is **planned/in-progress** (main feature development)
6. **CORS:** Enabled globally with `app.enableCors()` - configure origins for production
7. **S3 URL parsing:** Delete logic extracts key from full URL - breaks if `S3_PUBLIC_URL` format changes
8. **Pagination limits:** Posts endpoint has hard limit of 50 items per page (prevents abuse)

## Production Readiness

⚠️ **CRITICAL before production deployment:**

1. **Disable TypeORM synchronize:**
   ```typescript
   // In src/app.module.ts, change:
   synchronize: true,  // ❌ DEVELOPMENT ONLY
   // To:
   synchronize: false, // ✅ PRODUCTION
   ```
   Then create proper migrations:
   ```bash
   npm run typeorm migration:generate -- -n InitialSchema
   npm run typeorm migration:run
   ```

2. **Configure proper CORS origins** (not wildcard `*`)
3. **Validate all environment variables** are production-secure
4. **Test S3 storage** with production credentials before go-live

## Documentation Structure

All project documentation is stored in the `documentation/` folder. **Always read relevant documentation before working on related tasks.**

### Documentation Files & When to Read Them

| File | Read When Working On | Contains |
|------|---------------------|----------|
| `documentation/API.md` | API endpoints, testing, curl examples | Complete API reference with request/response examples |
| `documentation/E2E_TESTING.md` | E2E tests, Jest, testing, CI/CD | Complete e2e testing guide with examples and best practices |
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
- **Testing/E2E tests** → `documentation/E2E_TESTING.md`
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
[Other doc](./API.md)                      # Same folder
[Root file](../manage.sh)                  # Root of project

# Inside root README.md or .github/ files
[Documentation](../documentation/DEPLOYMENT.md)  # From .github/ to documentation/
[Root file](../manage.sh)                        # From .github/ to root
```

## File References

- Auth config: `src/auth/auth.module.ts` (JWT registration)
- Main app config: `src/app.module.ts` (TypeORM + global ConfigModule)
- Bootstrap: `src/main.ts` (global pipes, CORS, API prefix)
- PM2 config: `ecosystem.config.js` (production process management)
- Management script: `manage.sh` (VPS management utilities)
