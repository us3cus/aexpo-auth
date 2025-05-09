import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ShikimoriStrategy extends PassportStrategy(Strategy, 'shikimori') {
  constructor(private configService: ConfigService) {
    const clientId = configService.get<string>('SHIKIMORI_CLIENT_ID');
    const clientSecret = configService.get<string>('SHIKIMORI_CLIENT_SECRET');
    const redirectUri = configService.get<string>('SHIKIMORI_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing required Shikimori OAuth configuration');
    }

    super({
      authorizationURL: 'https://shikimori.one/oauth/authorize',
      tokenURL: 'https://shikimori.one/oauth/token',
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: redirectUri,
      scope: ['user_rates'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // TODO: Implement user creation/update logic
    return {
      id: profile.id,
      email: profile.email,
      accessToken,
    };
  }
} 