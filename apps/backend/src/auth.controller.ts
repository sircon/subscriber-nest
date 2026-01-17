import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

class SendCodeDto {
  email: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  async sendCode(@Body() body: SendCodeDto): Promise<{ success: true }> {
    return this.authService.sendVerificationCode(body.email);
  }
}
