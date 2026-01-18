import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import {
  VerificationCode,
  User,
  Session,
} from "@subscriber-nest/shared/entities";
import { EmailService } from "./email.service";
import { BillingSubscriptionService } from "./billing-subscription.service";
import * as crypto from "crypto";

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
    private billingSubscriptionService: BillingSubscriptionService,
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
        "Too many verification codes requested. Please try again later.",
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
      throw new BadRequestException("Invalid email format");
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
      throw new BadRequestException("Failed to send verification email");
    }

    return { success: true };
  }

  /**
   * Generate a secure random token for session
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Verify code and create session
   */
  async verifyCode(
    email: string,
    code: string,
  ): Promise<{
    token: string;
    user: {
      id: string;
      email: string;
      isOnboarded: boolean;
      deleteRequestedAt: Date | null;
    };
  }> {
    // Find verification code
    const verificationCode = await this.verificationCodeRepository.findOne({
      where: { email, code },
    });

    if (!verificationCode) {
      throw new UnauthorizedException("Invalid verification code");
    }

    // Check if code is already used
    if (verificationCode.used) {
      throw new UnauthorizedException(
        "Verification code has already been used",
      );
    }

    // Check if code is expired
    if (verificationCode.expiresAt < new Date()) {
      throw new UnauthorizedException("Verification code has expired");
    }

    // Find or create user
    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      user = this.userRepository.create({
        email,
        isOnboarded: false,
      });
      user = await this.userRepository.save(user);
    }

    // Mark verification code as used
    verificationCode.used = true;
    await this.verificationCodeRepository.save(verificationCode);

    // Generate session token
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session
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

  /**
   * Logout by deleting session
   */
  async logout(token: string): Promise<{ success: true }> {
    // Find and delete session by token
    const session = await this.sessionRepository.findOne({
      where: { token },
    });

    if (session) {
      await this.sessionRepository.remove(session);
    }

    return { success: true };
  }

  /**
   * Mark user as onboarded (requires active subscription)
   */
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
      throw new UnauthorizedException("User not found");
    }

    // Check if user has active subscription
    const hasActiveSubscription =
      await this.billingSubscriptionService.hasActiveSubscription(userId);
    if (!hasActiveSubscription) {
      throw new BadRequestException(
        "Active subscription required to complete onboarding",
      );
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
