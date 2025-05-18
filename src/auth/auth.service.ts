import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
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
    
    const { password, ...result } = user;
    return result;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { email } });
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async handleShikimoriCallback(code: string) {
    const clientId = this.configService.get<string>('SHIKIMORI_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SHIKIMORI_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('SHIKIMORI_REDIRECT_URI');

    // TODO: Exchange code for access token using Shikimori API
    const accessToken = 'dummy_token';
    const shikimoriUser = { 
      id: '123', 
      email: 'user@example.com',
      nickname: 'User',
      name: 'John',
      last_name: 'Doe'
    };

    let user = await this.usersRepository.findOne({ 
      where: { shikimoriId: shikimoriUser.id } 
    });

    if (!user) {
      user = this.usersRepository.create({
        email: shikimoriUser.email,
        shikimoriId: shikimoriUser.id,
        shikimoriAccessToken: accessToken,
        firstName: shikimoriUser.name,
        lastName: shikimoriUser.last_name,
        password: await bcrypt.hash(Math.random().toString(36), 10), // Generate random password
      });
      await this.usersRepository.save(user);
    } else {
      user.shikimoriAccessToken = accessToken;
      user.firstName = shikimoriUser.name;
      user.lastName = shikimoriUser.last_name;
      await this.usersRepository.save(user);
    }

    return this.login(user);
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

    if (updateProfileDto.shikimoriId) {
      user.shikimoriId = updateProfileDto.shikimoriId;
    }

    const updatedUser = await this.usersRepository.save(user);
    const { password, ...result } = updatedUser;
    return result;
  }

  async updateAvatarUrl(userId: number, avatarUrl: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    user.avatarUrl = avatarUrl;
    await this.usersRepository.save(user);
  }
} 