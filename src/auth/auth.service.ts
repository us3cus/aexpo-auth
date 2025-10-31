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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
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

    await this.usersRepository.save(user);

    // Return user without password and avatarData
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Return user without password and avatarData
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (updateProfileDto.password) {
      const hashedPassword = await bcrypt.hash(updateProfileDto.password, 10);
      user.password = hashedPassword;
    }

    if (updateProfileDto.firstName) {
      user.firstName = updateProfileDto.firstName;
    }

    if (updateProfileDto.lastName) {
      user.lastName = updateProfileDto.lastName;
    }

    const updatedUser = await this.usersRepository.save(user);

    // Check if user has avatar
    const userWithAvatar = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'avatarData'],
    });

    const baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:5001',
    );

    const avatarUrl = userWithAvatar?.avatarData
      ? `${baseUrl}/api/v1/upload/avatar/${userId}`
      : null;

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      avatarUrl,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async updateAvatarUrl(userId: number, avatarUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    user.avatarUrl = avatarUrl;
    await this.usersRepository.save(user);
  }

  async updateAvatar(userId: number, avatarData: Buffer, mimeType: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    user.avatarData = avatarData;
    user.avatarMimeType = mimeType;
    // Clear old avatarUrl since we're now using database storage
    user.avatarUrl = undefined;
    await this.usersRepository.save(user);
  }

  async getUserAvatar(
    userId: number,
  ): Promise<{ data: Buffer; mimeType: string } | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'avatarData', 'avatarMimeType'],
    });

    if (!user || !user.avatarData) {
      return null;
    }

    return {
      data: user.avatarData,
      mimeType: user.avatarMimeType || 'image/webp',
    };
  }
}
