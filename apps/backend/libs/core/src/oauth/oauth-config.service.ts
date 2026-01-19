import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EspType } from '@app/database/entities/esp-connection.entity';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string;
}

@Injectable()
export class OAuthConfigService {
  private readonly kitConfig: OAuthConfig;
  private readonly mailchimpConfig: OAuthConfig;

  constructor(private configService: ConfigService) {
    // Validate and load Kit OAuth configuration
    const kitClientId = this.configService.get<string>('KIT_OAUTH_CLIENT_ID');
    const kitClientSecret = this.configService.get<string>(
      'KIT_OAUTH_CLIENT_SECRET'
    );
    const kitAuthorizationUrl = this.configService.get<string>(
      'KIT_OAUTH_AUTHORIZATION_URL'
    );
    const kitTokenUrl = this.configService.get<string>('KIT_OAUTH_TOKEN_URL');
    const kitScopes = this.configService.get<string>('KIT_OAUTH_SCOPES');

    if (
      !kitClientId ||
      !kitClientSecret ||
      !kitAuthorizationUrl ||
      !kitTokenUrl ||
      !kitScopes
    ) {
      throw new Error(
        'Missing required Kit OAuth configuration. Required environment variables: KIT_OAUTH_CLIENT_ID, KIT_OAUTH_CLIENT_SECRET, KIT_OAUTH_AUTHORIZATION_URL, KIT_OAUTH_TOKEN_URL, KIT_OAUTH_SCOPES'
      );
    }

    this.kitConfig = {
      clientId: kitClientId,
      clientSecret: kitClientSecret,
      authorizationUrl: kitAuthorizationUrl,
      tokenUrl: kitTokenUrl,
      scopes: kitScopes,
    };

    // Validate and load Mailchimp OAuth configuration
    const mailchimpClientId = this.configService.get<string>(
      'MAILCHIMP_OAUTH_CLIENT_ID'
    );
    const mailchimpClientSecret = this.configService.get<string>(
      'MAILCHIMP_OAUTH_CLIENT_SECRET'
    );
    const mailchimpAuthorizationUrl = this.configService.get<string>(
      'MAILCHIMP_OAUTH_AUTHORIZATION_URL'
    );
    const mailchimpTokenUrl = this.configService.get<string>(
      'MAILCHIMP_OAUTH_TOKEN_URL'
    );
    const mailchimpScopes = this.configService.get<string>(
      'MAILCHIMP_OAUTH_SCOPES'
    );

    if (
      !mailchimpClientId ||
      !mailchimpClientSecret ||
      !mailchimpAuthorizationUrl ||
      !mailchimpTokenUrl ||
      !mailchimpScopes
    ) {
      throw new Error(
        'Missing required Mailchimp OAuth configuration. Required environment variables: MAILCHIMP_OAUTH_CLIENT_ID, MAILCHIMP_OAUTH_CLIENT_SECRET, MAILCHIMP_OAUTH_AUTHORIZATION_URL, MAILCHIMP_OAUTH_TOKEN_URL, MAILCHIMP_OAUTH_SCOPES'
      );
    }

    this.mailchimpConfig = {
      clientId: mailchimpClientId,
      clientSecret: mailchimpClientSecret,
      authorizationUrl: mailchimpAuthorizationUrl,
      tokenUrl: mailchimpTokenUrl,
      scopes: mailchimpScopes,
    };
  }

  /**
   * Returns OAuth configuration for the specified ESP type
   * @param espType - The ESP type (kit or mailchimp)
   * @returns OAuthConfig for the specified ESP
   * @throws Error if espType is not supported or config is missing
   */
  getConfig(espType: EspType): OAuthConfig {
    switch (espType) {
      case EspType.KIT:
        return this.kitConfig;
      case EspType.MAILCHIMP:
        return this.mailchimpConfig;
      default:
        throw new Error(
          `OAuth is not supported for ESP type: ${espType}. Supported types: ${EspType.KIT}, ${EspType.MAILCHIMP}`
        );
    }
  }
}
