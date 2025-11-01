import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { uploadConfig } from './config/upload.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly authService: AuthService,
  ) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', uploadConfig))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Compress the image
    const compressedImage = await this.uploadService.compressImage(file.buffer);

    // Upload to S3 and store URL in database
    await this.authService.updateAvatar(
      req.user.id as number,
      compressedImage,
      'image/webp',
    );

    return {
      message: 'Avatar uploaded successfully',
      size: compressedImage.length,
      originalSize: file.size,
      compressionRatio: (
        ((file.size - compressedImage.length) / file.size) *
        100
      ).toFixed(2),
    };
  }
}
