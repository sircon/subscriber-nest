import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import { VerificationCodeEmail } from './emails/verification-code-email';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.resend = new Resend(apiKey);
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'onboarding@audiencesafe.com';

    const emailHtml = await render(
      React.createElement(VerificationCodeEmail, { code }),
      { pretty: true }
    );

    await this.resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Your verification code for Audience Safe',
      html: emailHtml,
    });
  }
}
