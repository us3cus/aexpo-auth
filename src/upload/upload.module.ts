import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { uploadConfig } from './config/upload.config';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register(uploadConfig),
    AuthModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {} 