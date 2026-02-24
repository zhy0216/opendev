import 'reflect-metadata';
import { injectable } from 'inversify';
import { env } from '@repo/env';
import { createServiceLogger } from '@repo/logger';
import crypto from 'node:crypto';

const log = createServiceLogger('EncryptionService');

@injectable()
export class EncryptionService {
  private key: Buffer;

  constructor() {
    this.key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Return base64(iv + ciphertext + authTag)
    const result = Buffer.concat([iv, encrypted, authTag]).toString('base64');

    log.debug('Data encrypted successfully', { ciphertextLength: result.length });

    return result;
  }

  decrypt(ciphertext: string): string {
    const data = Buffer.from(ciphertext, 'base64');

    // Extract IV (first 12 bytes), auth tag (last 16 bytes), ciphertext (middle)
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(data.length - 16);
    const encrypted = data.subarray(12, data.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    log.debug('Data decrypted successfully');

    return decrypted.toString('utf8');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
