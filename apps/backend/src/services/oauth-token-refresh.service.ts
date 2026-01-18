import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  EspConnection,
  AuthMethod,
  EspType,
} from '../entities/esp-connection.entity';
import { OAuthConfigService } from './oauth-config.service';
import { EncryptionService } from './encryption.service';

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

@Injectable()
export class OAuthTokenRefreshService {
  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private oauthConfigService: OAuthConfigService,
    private encryptionService: EncryptionService,
    private httpService: HttpService
  ) {}

  /**
   * Refreshes an expired OAuth access token using the refresh token
   * @param espConnection - The ESP connection containing the refresh token
   * @returns Token refresh result with new access token, optional refresh token, and expiry time
   * @throws BadRequestException if connection is not OAuth-based or refresh token is missing
   * @throws InternalServerErrorException if token refresh fails (invalid/expired refresh token, API errors)
   */
  async refreshToken(
    espConnection: EspConnection
  ): Promise<TokenRefreshResult> {
    // Validate this is an OAuth connection
    if (espConnection.authMethod !== AuthMethod.OAUTH) {
      throw new BadRequestException(
        'Token refresh is only supported for OAuth connections'
      );
    }

    // Validate refresh token exists
    if (!espConnection.encryptedRefreshToken) {
      throw new BadRequestException(
        'Refresh token is missing for this OAuth connection'
      );
    }

    // Validate ESP type supports OAuth
    if (
      espConnection.espType !== EspType.KIT &&
      espConnection.espType !== EspType.MAILCHIMP
    ) {
      throw new BadRequestException(
        `OAuth token refresh is not supported for ESP type: ${espConnection.espType}`
      );
    }

    // Get OAuth configuration for the ESP
    let oauthConfig;
    try {
      oauthConfig = this.oauthConfigService.getConfig(espConnection.espType);
    } catch (error) {
      throw new InternalServerErrorException(
        `OAuth configuration not available for ${espConnection.espType}. Please contact support.`
      );
    }

    // Decrypt the refresh token
    let refreshToken: string;
    try {
      refreshToken = this.encryptionService.decrypt(
        espConnection.encryptedRefreshToken
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to decrypt refresh token. The token may be corrupted.'
      );
    }

    // Exchange refresh token for new access token
    let tokenResponse: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };
    try {
      const tokenRequestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
      });

      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
          refresh_token?: string;
          expires_in?: number;
          token_type?: string;
        }>(oauthConfig.tokenUrl, tokenRequestBody.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      if (!response.data.access_token) {
        throw new InternalServerErrorException(
          'Token refresh failed: No access token in response'
        );
      }

      tokenResponse = response.data;
    } catch (error: any) {
      // Handle token refresh errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        // 400 Bad Request - usually means invalid refresh token
        if (status === 400) {
          throw new BadRequestException(
            `Token refresh failed: Invalid refresh token. Please reconnect your account.`
          );
        }

        // 401 Unauthorized - refresh token expired or revoked
        if (status === 401) {
          throw new BadRequestException(
            `Token refresh failed: Refresh token has expired or been revoked. Please reconnect your account.`
          );
        }

        // Other errors
        throw new InternalServerErrorException(
          `Token refresh failed: ${status} - ${JSON.stringify(errorData)}`
        );
      }

      // Network or other errors
      throw new InternalServerErrorException(
        `Token refresh failed: ${error.message || 'Unknown error'}`
      );
    }

    // Calculate token expiry time
    const expiresIn = tokenResponse.expires_in || 3600; // Default to 1 hour if not provided
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

    // Encrypt new tokens
    const encryptedAccessToken = this.encryptionService.encrypt(
      tokenResponse.access_token
    );
    const encryptedRefreshToken = tokenResponse.refresh_token
      ? this.encryptionService.encrypt(tokenResponse.refresh_token)
      : espConnection.encryptedRefreshToken; // Keep existing refresh token if new one not provided

    // Update connection in database
    espConnection.encryptedAccessToken = encryptedAccessToken;
    espConnection.encryptedRefreshToken = encryptedRefreshToken;
    espConnection.tokenExpiresAt = tokenExpiresAt;
    espConnection.lastValidatedAt = new Date();

    await this.espConnectionRepository.save(espConnection);

    // Return token refresh result
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn,
    };
  }
}
