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

    const publicUrl = this.uploadService.getPublicUrl(file.filename);

    // Обновляем URL аватара в базе данных
    await this.authService.updateAvatarUrl(req.user.id, publicUrl);

    return {
      filename: file.filename,
      url: publicUrl,
    };
  }
}
