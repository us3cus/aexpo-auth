import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ConfigService } from '@nestjs/config';

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  avatarMimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async findById(id: number): Promise<UserResponse | null> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'avatarMimeType',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      return null;
    }

    // Check if user has avatar by querying separately
    const userWithAvatar = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'avatarData'],
    });

    const baseUrl = this.configService.get<string>(
      'BASE_URL',
      'http://localhost:5001',
    );

    const avatarUrl = userWithAvatar?.avatarData
      ? `${baseUrl}/api/v1/upload/avatar/${id}`
      : null;

    return {
      ...user,
      avatarUrl,
    };
  }
}
