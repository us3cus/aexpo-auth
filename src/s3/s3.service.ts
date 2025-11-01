import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const region = this.configService.get<string>('S3_REGION') || 'garage';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY');
    const bucket = this.configService.get<string>('S3_BUCKET');
    const publicUrl = this.configService.get<string>('S3_PUBLIC_URL');

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      throw new Error(
        'S3 configuration is incomplete. Please check your .env file for S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, and S3_PUBLIC_URL',
      );
    }

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Важно для Garage S3
    });
    this.bucket = bucket;
    this.publicUrl = publicUrl;
  }

  async uploadFile(
    file: Buffer,
    mimeType: string,
    folder: 'avatars' | 'posts',
  ): Promise<string> {
    const fileExtension = this.getExtensionFromMimeType(mimeType);
    const fileName = `${folder}/${uuidv4()}${fileExtension}`;

    console.log(`Uploading file: ${fileName}`);
    console.log(`MIME Type: ${mimeType}`);
    console.log(`File size: ${file.length} bytes`);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
      Body: file,
      ContentType: mimeType,
    });

    try {
      const result = await this.s3Client.send(command);
      const fileUrl = `${this.publicUrl}/${this.bucket}/${fileName}`;
      console.log(`File uploaded successfully: ${fileUrl}`);
      console.log('S3 Response ETag:', result.ETag);
      return fileUrl;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Извлекаем ключ файла из URL
      // URL format: https://cdn.temten.me/aexpo/avatars/uuid.webp
      // Нужно получить: avatars/uuid.webp
      const urlParts = fileUrl.split('/');
      const bucketIndex = urlParts.indexOf(this.bucket);
      
      if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
        // Берем все части после bucket name
        const fileName = urlParts.slice(bucketIndex + 1).join('/');
        
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: fileName,
        });

        await this.s3Client.send(command);
        console.log(`File deleted successfully: ${fileName}`);
      } else {
        console.warn(`Invalid S3 URL format: ${fileUrl}`);
      }
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      // Не выбрасываем ошибку, чтобы не блокировать удаление записи из БД
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/webm': '.webm',
    };

    return mimeToExt[mimeType] || '';
  }
}
