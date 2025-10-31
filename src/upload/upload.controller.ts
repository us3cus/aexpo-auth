import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Req,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
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

    // Store in database with WebP mime type
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

  @Get('avatar/:userId')
  async getAvatar(
    @Param('userId', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    const avatar = await this.authService.getUserAvatar(userId);

    if (!avatar) {
      throw new NotFoundException('Avatar not found');
    }

    res.set({
      'Content-Type': avatar.mimeType,
      'Content-Length': avatar.data.length,
      'Cache-Control': 'public, max-age=31536000',
    });

    res.send(avatar.data);
  }
}
