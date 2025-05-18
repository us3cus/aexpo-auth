import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  getPublicUrl(filename: string): string {
    const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:5001');
    return `${baseUrl}/avatars/${filename}`;
  }
} 