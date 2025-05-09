import { Controller, Post, Body, UseGuards, Get, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req) {
    return this.authService.login(req.user);
  }

  @Get('shikimori/login')
  shikimoriLogin(@Res() res) {
    const clientId = this.configService.get<string>('SHIKIMORI_CLIENT_ID');
    const redirectUri = this.configService.get<string>('SHIKIMORI_REDIRECT_URI');
    const url = `https://shikimori.one/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=user_rates`;
    res.redirect(url);
  }

  @Get('shikimori/callback')
  async shikimoriCallback(@Req() req) {
    const { code } = req.query;
    return this.authService.handleShikimoriCallback(code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
} 