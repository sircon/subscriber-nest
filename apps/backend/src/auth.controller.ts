import { Controller, Post, Body, Get, UseGuards, Headers } from '@nestjs/common';
import { IsEmail, IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';

class SendCodeDto {
  @IsEmail()
  email: string;
}

class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  async sendCode(@Body() body: SendCodeDto): Promise<{ success: true }> {
    return this.authService.sendVerificationCode(body.email);
  }

  @Post('verify-code')
  async verifyCode(
    @Body() body: VerifyCodeDto,
  ): Promise<{ token: string; user: { id: string; email: string; isOnboarded: boolean; deleteRequestedAt: Date | null } }> {
    return this.authService.verifyCode(body.email, body.code);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(
    @CurrentUser() user: User,
  ): Promise<{ user: { id: string; email: string; isOnboarded: boolean; deleteRequestedAt: Date | null } }> {
    return {
      user: {
        id: user.id,
        email: user.email,
        isOnboarded: user.isOnboarded,
        deleteRequestedAt: user.deleteRequestedAt,
      },
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Headers('authorization') authHeader: string): Promise<{ success: true }> {
    // Extract token from "Bearer <token>" format
    const token = authHeader?.split(' ')[1];
    if (!token) {
      throw new Error('Token not found in authorization header');
    }

    return this.authService.logout(token);
  }

  @Post('complete-onboarding')
  @UseGuards(AuthGuard)
  async completeOnboarding(
    @CurrentUser() user: User,
  ): Promise<{ success: true; user: { id: string; email: string; isOnboarded: boolean; deleteRequestedAt: Date | null } }> {
    return this.authService.completeOnboarding(user.id);
  }
}
