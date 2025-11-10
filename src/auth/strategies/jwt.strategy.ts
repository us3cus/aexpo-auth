import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    jwtVersion?: number;
  }): Promise<{ id: number; email: string }> {
    // Validate JWT version to ensure token hasn't been invalidated
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'jwtVersion'],
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const tokenVersion = payload.jwtVersion ?? 0;
    const currentVersion = user.jwtVersion ?? 0;

    if (tokenVersion !== currentVersion) {
      throw new UnauthorizedException(
        'Токен недействителен. Пожалуйста, войдите снова.',
      );
    }

    return { id: payload.sub, email: payload.email };
  }
}
