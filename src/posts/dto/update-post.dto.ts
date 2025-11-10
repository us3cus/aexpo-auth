import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';
import { PostPrivacy } from '../entities/post.entity';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Текст поста не может быть пустым' })
  text?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsEnum(PostPrivacy, { message: 'Неверное значение приватности' })
  privacy?: PostPrivacy;
}
