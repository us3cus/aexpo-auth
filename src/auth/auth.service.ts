import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.usersRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    const savedUser = await this.usersRepository.save(user);

    // Password is automatically excluded by @Exclude() decorator + ClassSerializerInterceptor
    return savedUser;
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  } | null> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Return minimal user data for JWT payload
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }
    return null;
  }

  async login(user: { id: number; email: string }) {
    const fullUser = await this.usersRepository.findOne({
      where: { id: user.id },
      select: ['id', 'email', 'jwtVersion'],
    });

    const payload = {
      email: user.email,
      sub: user.id,
      jwtVersion: fullUser?.jwtVersion || 0,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    let passwordChanged = false;

    // If changing password, verify current password
    if (updateProfileDto.password) {
      if (!updateProfileDto.currentPassword) {
        throw new UnauthorizedException(
          'Текущий пароль обязателен для смены пароля',
        );
      }

      const isPasswordValid = await bcrypt.compare(
        updateProfileDto.currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Неверный текущий пароль');
      }

      const hashedPassword = await bcrypt.hash(updateProfileDto.password, 10);
      user.password = hashedPassword;
      passwordChanged = true;
    }

    // Update other fields
    if (updateProfileDto.firstName) {
      user.firstName = updateProfileDto.firstName;
    }

    if (updateProfileDto.lastName) {
      user.lastName = updateProfileDto.lastName;
    }

    // Invalidate all JWT tokens if password changed
    if (passwordChanged) {
      user.jwtVersion = (user.jwtVersion || 0) + 1;
    }

    const updatedUser = await this.usersRepository.save(user);

    // If password changed, add new access token to response
    if (passwordChanged) {
      const payload = {
        email: updatedUser.email,
        sub: updatedUser.id,
        jwtVersion: updatedUser.jwtVersion,
      };

      return {
        ...updatedUser,
        access_token: this.jwtService.sign(payload),
        message: 'Пароль изменен. Все активные сессии завершены.',
      };
    }

    // Password is automatically excluded by @Exclude() decorator
    return updatedUser;
  }

  async updateAvatarUrl(userId: number, avatarUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Удаляем старый аватар из S3, если он был
    if (user.avatarUrl) {
      await this.s3Service.deleteFile(user.avatarUrl);
    }

    user.avatarUrl = avatarUrl;
    await this.usersRepository.save(user);
  }

  async updateAvatar(userId: number, avatarData: Buffer, mimeType: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Удаляем старый аватар из S3, если он был
    if (user.avatarUrl) {
      await this.s3Service.deleteFile(user.avatarUrl);
    }

    // Загружаем новый аватар в S3
    const avatarUrl = await this.s3Service.uploadFile(
      avatarData,
      mimeType,
      'avatars',
    );

    user.avatarUrl = avatarUrl;
    user.avatarMimeType = mimeType;
    await this.usersRepository.save(user);
  }
}
