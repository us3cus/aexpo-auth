import {
  IsString,
  IsOptional,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  // Current password is required only when changing password
  @ValidateIf((o) => o.password !== undefined)
  @IsString({ message: 'Текущий пароль обязателен при смене пароля' })
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Новый пароль должен содержать минимум 6 символов' })
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Фамилия должна содержать минимум 2 символа' })
  lastName?: string;
}
