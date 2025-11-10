import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { uploadConfig } from './config/upload.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { FileValidationService } from '../common/file-validation.service';

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
  };
}

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly fileValidationService: FileValidationService,
  ) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', uploadConfig))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file using magic byte detection (security)
    await this.fileValidationService.validateAndThrow(
      file.buffer,
      file.mimetype,
    );

    // Compress the image
    const compressedImage = await this.uploadService.compressImage(file.buffer);

    // Upload to S3 and store URL in database
    await this.authService.updateAvatar(
      req.user.id,
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
  async getAvatarUrl(@Param('userId') userId: string) {
    const user = await this.usersService.findById(parseInt(userId));

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      avatarUrl: user.avatarUrl,
      avatarMimeType: user.avatarMimeType,
    };
  }
}
