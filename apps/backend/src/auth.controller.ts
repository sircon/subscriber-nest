import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

class SendCodeDto {
  email: string;
}

class VerifyCodeDto {
  email: string;
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
  ): Promise<{ token: string; user: { id: string; email: string; isOnboarded: boolean } }> {
    return this.authService.verifyCode(body.email, body.code);
  }
}
