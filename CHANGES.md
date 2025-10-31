# Avatar Storage Changes Summary

## What Changed

### ✅ Database Storage
- Avatars are now stored directly in PostgreSQL database as binary data (bytea)
- New columns added to `users` table: `avatarData` and `avatarMimeType`
- No more local file storage in `public/avatars/` directory

### ✅ Image Compression
- All uploaded images are automatically compressed using `sharp` library
- Images resized to max 800x800 pixels (maintaining aspect ratio)
- Converted to WebP format for optimal compression (~50-70% size reduction)
- Quality set to 80% for good balance between size and quality

### ✅ Updated Files

**Modified:**
1. `src/auth/entities/user.entity.ts` - Added avatarData and avatarMimeType columns
2. `src/auth/auth.service.ts` - Added updateAvatar() and getUserAvatar() methods
3. `src/upload/upload.service.ts` - Added compressImage() method
4. `src/upload/upload.controller.ts` - Complete rewrite for database storage
5. `src/upload/config/upload.config.ts` - Changed from diskStorage to memoryStorage
6. `src/main.ts` - Removed static file serving (no longer needed)
7. `API.md` - Updated documentation for new endpoints

**New Files:**
1. `AVATAR_MIGRATION.md` - Detailed migration guide
2. `CHANGES.md` - This file

**Dependencies Added:**
- `sharp` - Image processing library
- `@types/sharp` - TypeScript definitions

### ✅ API Changes

**Upload Avatar - POST /api/v1/upload/avatar**
```json
// Before
{
  "filename": "uuid.jpg",
  "url": "http://localhost:5001/avatars/uuid.jpg"
}

// After
{
  "message": "Avatar uploaded successfully",
  "size": 45678,
  "originalSize": 123456,
  "compressionRatio": "63.01"
}
```

**New Endpoint - GET /api/v1/upload/avatar/:userId**
- Returns the compressed avatar image directly
- Content-Type: image/webp
- Includes long-term cache headers (1 year)

## Testing

### 1. Upload an Avatar
```bash
curl -X POST http://localhost:5001/api/v1/upload/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg"
```

Expected response:
```json
{
  "message": "Avatar uploaded successfully",
  "size": 12345,
  "originalSize": 54321,
  "compressionRatio": "77.27"
}
```

### 2. Retrieve Avatar
```bash
curl -X GET http://localhost:5001/api/v1/upload/avatar/1 \
  --output avatar.webp
```

Or open in browser: `http://localhost:5001/api/v1/upload/avatar/1`

### 3. Check Database
```sql
SELECT id, email, 
       LENGTH(avatar_data) as avatar_size_bytes,
       avatar_mime_type,
       avatar_url
FROM users 
WHERE avatar_data IS NOT NULL;
```

## Benefits

1. **Reduced Storage Complexity** - No file system management needed
2. **Better Compression** - WebP format saves 50-70% space
3. **Automatic Optimization** - All images standardized to 800x800 max
4. **Database Backups Include Avatars** - Simplified backup/restore
5. **CDN-Ready** - Easy to add CDN layer later if needed

## Migration Notes

- Existing `avatarUrl` field preserved for backward compatibility
- Old files in `public/avatars/` can be manually deleted
- TypeORM synchronize will automatically add new columns
- No data loss - new uploads simply use new storage method
