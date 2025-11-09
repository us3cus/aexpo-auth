import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
import { PostPrivacy } from '../entities/post.entity';

export class CreatePostDto {
  @IsString()
  @MinLength(1, { message: 'Текст поста не может быть пустым' })
  text: string;

  @IsOptional()
  @IsArray({ message: 'Хештеги должны быть массивом' })
  @ArrayMaxSize(10, { message: 'Максимум 10 хештегов' })
  @IsString({ each: true, message: 'Каждый хештег должен быть строкой' })
  @Matches(/^#[a-zA-Zа-яА-ЯёЁ0-9_]+$/, {
    each: true,
    message: 'Хештег должен начинаться с # и содержать только буквы, цифры и _',
  })
  hashtags?: string[];

  @IsOptional()
  @IsEnum(PostPrivacy, { message: 'Неверное значение приватности' })
  privacy?: PostPrivacy;
}
