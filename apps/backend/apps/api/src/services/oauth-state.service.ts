import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OAuthState } from '@app/database/entities/oauth-state.entity';
import { EspType } from '@app/database/entities/esp-connection.entity';
import * as crypto from 'crypto';

@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);
  private readonly STATE_EXPIRY_MINUTES = 10;

  constructor(
    @InjectRepository(OAuthState)
    private oauthStateRepository: Repository<OAuthState>
  ) {}

  /**
   * Creates a new OAuth state token for the given user and ESP type
   * State expires after 10 minutes
   *
   * @param userId - The user ID
   * @param espType - The ESP type (kit or mailchimp)
   * @param redirectUri - Optional redirect URI to return to after OAuth callback
   * @param isOnboarding - Whether this OAuth flow is part of the onboarding process
   * @returns The generated state string
   */
  async createState(
    userId: string,
    espType: EspType,
    redirectUri?: string,
    isOnboarding: boolean = false
  ): Promise<string> {
    // Generate a random 32-byte state string (64 hex characters)
    const state = crypto.randomBytes(32).toString('hex');

    // Calculate expiry time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.STATE_EXPIRY_MINUTES);

    // Store state in database
    const oauthState = this.oauthStateRepository.create({
      userId,
      espType,
      state,
      redirectUri: redirectUri || null,
      isOnboarding,
      expiresAt,
    });

    await this.oauthStateRepository.save(oauthState);

    this.logger.debug(
      `Created OAuth state for user ${userId}, ESP ${espType}, expires at ${expiresAt.toISOString()}`
    );

    return state;
  }

  /**
   * Validates an OAuth state token and returns user information
   * Throws NotFoundException if state is invalid or expired
   *
   * @param state - The state string to validate
   * @param espType - The ESP type to validate against
   * @returns User ID, optional redirect URI, and isOnboarding flag
   */
  async validateState(
    state: string,
    espType: EspType
  ): Promise<{ userId: string; redirectUri?: string; isOnboarding: boolean }> {
    const oauthState = await this.oauthStateRepository.findOne({
      where: { state, espType },
    });

    if (!oauthState) {
      this.logger.warn(`OAuth state not found: ${state} for ESP ${espType}`);
      throw new NotFoundException('Invalid OAuth state');
    }

    // Check if state has expired
    if (oauthState.expiresAt < new Date()) {
      this.logger.warn(
        `OAuth state expired: ${state} (expired at ${oauthState.expiresAt.toISOString()})`
      );
      // Delete expired state
      await this.oauthStateRepository.remove(oauthState);
      throw new NotFoundException('OAuth state has expired');
    }

    return {
      userId: oauthState.userId,
      redirectUri: oauthState.redirectUri || undefined,
      isOnboarding: oauthState.isOnboarding,
    };
  }

  /**
   * Deletes an OAuth state after it has been used
   *
   * @param state - The state string to delete
   */
  async deleteState(state: string): Promise<void> {
    const result = await this.oauthStateRepository.delete({ state });

    if (result.affected === 0) {
      this.logger.warn(
        `Attempted to delete non-existent OAuth state: ${state}`
      );
    } else {
      this.logger.debug(`Deleted OAuth state: ${state}`);
    }
  }

  /**
   * Cleans up expired OAuth states
   * This method is called by the scheduled cleanup job
   *
   * @returns Number of expired states deleted
   */
  async cleanupExpiredStates(): Promise<number> {
    const now = new Date();
    const result = await this.oauthStateRepository.delete({
      expiresAt: LessThan(now),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired OAuth states`);
    }

    return result.affected || 0;
  }
}
