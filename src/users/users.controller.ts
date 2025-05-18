import { Controller, Get, Param, UseGuards, NotFoundException, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(parseInt(id));
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }
} 