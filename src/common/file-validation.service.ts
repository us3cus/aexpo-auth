import { Injectable, BadRequestException } from '@nestjs/common';

interface FileValidationResult {
  isValid: boolean;
  detectedMimeType?: string;
  error?: string;
}

@Injectable()
export class FileValidationService {
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  private readonly ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];

  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

  async validateFile(
    buffer: Buffer,
    declaredMimeType: string,
  ): Promise<FileValidationResult> {
    // Используем fromBuffer (не fileTypeFromBuffer) для file-type v16
    const FileType = (await import('file-type')).default;
    const fileType = await FileType.fromBuffer(buffer);

    if (!fileType) {
      return {
        isValid: false,
        error: 'Не удалось определить тип файла',
      };
    }

    // Проверка соответствия заявленного и реального типа
    if (fileType.mime !== declaredMimeType) {
      return {
        isValid: false,
        error: `Несоответствие типа файла. Заявлен: ${declaredMimeType}, обнаружен: ${fileType.mime}`,
      };
    }

    // Проверка допустимых типов
    const isImage = this.ALLOWED_IMAGE_TYPES.includes(fileType.mime);
    const isVideo = this.ALLOWED_VIDEO_TYPES.includes(fileType.mime);

    if (!isImage && !isVideo) {
      return {
        isValid: false,
        error: `Недопустимый тип файла: ${fileType.mime}`,
      };
    }

    // Проверка размера
    const maxSize = isImage ? this.MAX_IMAGE_SIZE : this.MAX_VIDEO_SIZE;
    if (buffer.length > maxSize) {
      return {
        isValid: false,
        error: `Файл слишком большой. Максимум: ${maxSize / 1024 / 1024}MB`,
      };
    }

    return {
      isValid: true,
      detectedMimeType: fileType.mime,
    };
  }

  async validateAndThrow(
    buffer: Buffer,
    declaredMimeType: string,
  ): Promise<string> {
    const result = await this.validateFile(buffer, declaredMimeType);

    if (!result.isValid) {
      throw new BadRequestException(result.error);
    }

    return result.detectedMimeType!;
  }
}
