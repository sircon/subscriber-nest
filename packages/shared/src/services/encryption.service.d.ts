import { ConfigService } from '@nestjs/config';
export declare class EncryptionService {
    private configService;
    private readonly algorithm;
    private readonly keyLength;
    private readonly ivLength;
    private readonly saltLength;
    private readonly tagLength;
    private readonly encryptionKey;
    constructor(configService: ConfigService);
    encrypt(plaintext: string): string;
    decrypt(ciphertext: string): string;
}
