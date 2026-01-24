import { BillingSubscriptionService } from '@app/core/billing/billing-subscription.service';
import { Session } from '@app/database/entities/session.entity';
import { User } from '@app/database/entities/user.entity';
import { VerificationCode } from '@app/database/entities/verification-code.entity';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private emailService: EmailService,
    private billingSubscriptionService: BillingSubscriptionService
  ) {}

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async checkRateLimit(email: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCodes = await this.verificationCodeRepository.count({
      where: { email, createdAt: MoreThan(oneHourAgo) },
    });

    if (recentCodes >= 3) {
      throw new BadRequestException(
        'Too many verification codes requested. Please try again later.'
      );
    }
  }

  async sendVerificationCode(email: string): Promise<{ success: true }> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    await this.checkRateLimit(email);

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const verificationCode = this.verificationCodeRepository.create({
      email,
      code,
      expiresAt,
      used: false,
    });
    await this.verificationCodeRepository.save(verificationCode);

    try {
      await this.emailService.sendVerificationCode(email, code);
    } catch {
      throw new BadRequestException('Failed to send verification email');
    }

    return { success: true };
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async verifyCode(
    email: string,
    code: string
  ): Promise<{
    token: string;
    user: {
      id: string;
      email: string;
      isOnboarded: boolean;
      deleteRequestedAt: Date | null;
    };
  }> {
    const verificationCode = await this.verificationCodeRepository.findOne({
      where: { email, code },
    });

    if (!verificationCode) {
      throw new UnauthorizedException('Invalid verification code');
    }

    if (verificationCode.used) {
      throw new UnauthorizedException(
        'Verification code has already been used'
      );
    }

    if (verificationCode.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification code has expired');
    }

    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      user = this.userRepository.create({ email, isOnboarded: false });
      user = await this.userRepository.save(user);
    }

    verificationCode.used = true;
    await this.verificationCodeRepository.save(verificationCode);

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const session = this.sessionRepository.create({
      userId: user.id,
      token,
      expiresAt,
    });
    await this.sessionRepository.save(session);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        isOnboarded: user.isOnboarded,
        deleteRequestedAt: user.deleteRequestedAt,
      },
    };
  }

  async logout(token: string): Promise<{ success: true }> {
    const session = await this.sessionRepository.findOne({
      where: { token },
    });

    if (session) {
      await this.sessionRepository.remove(session);
    }

    return { success: true };
  }

  async completeOnboarding(userId: string): Promise<{
    success: true;
    user: {
      id: string;
      email: string;
      isOnboarded: boolean;
      deleteRequestedAt: Date | null;
    };
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.isOnboarded = true;
    await this.userRepository.save(user);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isOnboarded: user.isOnboarded,
        deleteRequestedAt: user.deleteRequestedAt,
      },
    };
  }
}
