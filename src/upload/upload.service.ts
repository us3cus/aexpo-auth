import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

@Injectable()
export class UploadService {
  async compressImage(buffer: Buffer): Promise<Buffer> {
    try {
      // Compress image to WebP format with quality 80
      // Resize to max 800x800 while maintaining aspect ratio
      return await sharp(buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Image compression failed: ${errorMessage}`);
    }
  }
}
