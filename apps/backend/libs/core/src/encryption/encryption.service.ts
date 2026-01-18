import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      'subscriber-nest-salt',
      100000,
      this.keyLength,
      'sha256'
    );
  }

  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const tag = cipher.getAuthTag();
      return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  decrypt(ciphertext: string): string {
    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error(
          'Invalid ciphertext format. Expected format: iv:tag:encryptedData'
        );
      }
      const [ivBase64, tagBase64, encryptedBase64] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');
      const encrypted = encryptedBase64;
      if (iv.length !== this.ivLength) {
        throw new Error('Invalid IV length');
      }
      if (tag.length !== this.tagLength) {
        throw new Error('Invalid authentication tag length');
      }
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
