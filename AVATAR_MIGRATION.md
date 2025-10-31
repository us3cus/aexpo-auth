# Avatar Storage Migration

## Overview
This document describes the migration from local file storage to PostgreSQL database storage for user avatars with automatic compression.

## Changes Made

### 1. Database Schema
Added new columns to the `users` table:
- `avatarData` (bytea) - Stores compressed avatar image data
- `avatarMimeType` (varchar) - Stores the MIME type of the avatar (typically 'image/webp')
- `avatarUrl` (varchar) - Kept for backward compatibility but will be null for new uploads

### 2. Image Compression
- Installed `sharp` library for image processing
- All uploaded images are automatically:
  - Resized to a maximum of 800x800 pixels (maintaining aspect ratio)
  - Converted to WebP format for optimal compression
  - Compressed with 80% quality setting
  - Stored directly in PostgreSQL as bytea

### 3. API Changes

#### Upload Avatar
**Endpoint:** `POST /api/v1/upload/avatar`
- Now accepts images up to 10MB (before compression)
- Supports: jpg, jpeg, png, gif, webp
- Returns compression statistics instead of URL
- Stores compressed image in database

**Response:**
```json
{
  "message": "Avatar uploaded successfully",
  "size": 45678,
  "originalSize": 123456,
  "compressionRatio": "63.01"
}
```

#### Get Avatar
**New Endpoint:** `GET /api/v1/upload/avatar/:userId`
- Returns the avatar image directly from database
- Serves as image/webp with appropriate cache headers
- Returns 404 if avatar not found

### 4. Benefits

1. **Better Compression**: WebP format provides 25-35% better compression than JPEG
2. **Database Storage**: No need for file system management or CDN for small deployments
3. **Automatic Optimization**: All images are automatically resized and optimized
4. **Consistent Format**: All avatars served in modern WebP format
5. **Cache-Friendly**: Long cache headers for optimal performance

### 5. Migration Path

For existing users with local avatars:
1. The `avatarUrl` field is retained for backward compatibility
2. When users upload a new avatar, it will be stored in the database and `avatarUrl` will be cleared
3. Old avatar files in `public/avatars/` can be manually cleaned up after migration

### 6. Performance Considerations

- **Compression Ratio**: Typically achieves 50-70% size reduction
- **Database Size**: WebP avatars at 800x800 typically range from 20KB to 100KB
- **Caching**: Browser caching reduces database load (1-year cache)
- **PostgreSQL**: Handles binary data efficiently, suitable for medium-scale applications

### 7. Environment Variables

No new environment variables required. The system works with existing database configuration.

### 8. Dependencies Added

```json
{
  "sharp": "^latest",
  "@types/sharp": "^latest"
}
```

## Usage Examples

### Upload Avatar
```bash
curl -X POST http://localhost:5001/api/v1/upload/avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@avatar.jpg"
```

### Get Avatar
```bash
curl -X GET http://localhost:5001/api/v1/upload/avatar/1 \
  --output avatar.webp
```

Or in HTML:
```html
<img src="http://localhost:5001/api/v1/upload/avatar/1" alt="User Avatar" />
```

## Rollback Plan

If you need to rollback to file-based storage:
1. Restore the original `upload.service.ts`, `upload.controller.ts`, and `upload.config.ts`
2. Remove the `avatarData` and `avatarMimeType` columns from the User entity
3. Restore static file serving in `main.ts`
4. Run database migration to drop the new columns
