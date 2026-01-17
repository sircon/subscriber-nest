import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { VerificationCode } from './entities/verification-code.entity';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
    private emailService: EmailService,
  ) {}

  /**
   * Generate a random 6-digit numeric code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check if email has exceeded rate limit (max 3 codes per hour)
   */
  private async checkRateLimit(email: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCodes = await this.verificationCodeRepository.count({
      where: {
        email,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    if (recentCodes >= 3) {
      throw new BadRequestException(
        'Too many verification codes requested. Please try again later.',
      );
    }
  }

  /**
   * Send verification code to email
   */
  async sendVerificationCode(email: string): Promise<{ success: true }> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check rate limit
    await this.checkRateLimit(email);

    // Generate 6-digit code
    const code = this.generateCode();

    // Calculate expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store code in database
    const verificationCode = this.verificationCodeRepository.create({
      email,
      code,
      expiresAt,
      used: false,
    });
    await this.verificationCodeRepository.save(verificationCode);

    // Send email via Resend
    try {
      await this.emailService.sendVerificationCode(email, code);
    } catch (error) {
      // If email fails, we still created the code, but log the error
      // In production, you might want to delete the code or handle this differently
      throw new BadRequestException('Failed to send verification email');
    }

    return { success: true };
  }
}
