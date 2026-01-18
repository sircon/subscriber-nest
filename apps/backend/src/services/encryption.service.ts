import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64; // 512 bits
  private readonly tagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    // Derive a 32-byte key from the provided key using PBKDF2
    // This ensures we have a consistent 256-bit key regardless of input length
    this.encryptionKey = crypto.pbkdf2Sync(key, 'subscriber-nest-salt', 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypts a plaintext string using AES-256-GCM
   * @param plaintext - The string to encrypt
   * @returns Encrypted string in format: iv:tag:encryptedData (all base64 encoded)
   * @throws Error if encryption fails
   */
  encrypt(plaintext: string): string {
    try {
      // Generate a random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get the authentication tag
      const tag = cipher.getAuthTag();
      
      // Return format: iv:tag:encryptedData (all base64)
      return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypts a ciphertext string encrypted with encrypt()
   * @param ciphertext - The encrypted string in format: iv:tag:encryptedData
   * @returns Decrypted plaintext string
   * @throws Error if decryption fails (invalid format, wrong key, corrupted data)
   */
  decrypt(ciphertext: string): string {
    try {
      // Split the ciphertext into components
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format. Expected format: iv:tag:encryptedData');
      }

      const [ivBase64, tagBase64, encryptedBase64] = parts;
      
      // Decode from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');
      const encrypted = encryptedBase64;
      
      // Validate IV length
      if (iv.length !== this.ivLength) {
        throw new Error('Invalid IV length');
      }
      
      // Validate tag length
      if (tag.length !== this.tagLength) {
        throw new Error('Invalid authentication tag length');
      }
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
