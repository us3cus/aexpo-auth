import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { uploadConfig } from './config/upload.config';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { FileValidationService } from '../common/file-validation.service';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register(uploadConfig),
    AuthModule,
    UsersModule,
  ],
  controllers: [UploadController],
  providers: [UploadService, FileValidationService],
  exports: [UploadService],
})
export class UploadModule {}
