import crypto from 'node:crypto';

// Test encryption key (32 bytes = 64 hex chars for AES-256)
export const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

// Test HMAC secret
export const TEST_HMAC_SECRET = 'test-internal-callback-secret-for-unit-tests';

/**
 * Creates crypto helper functions using the same algorithms as EncryptionService
 * but without requiring DI or env vars.
 */
export function createEncryptionHelpers(hexKey: string) {
  const key = Buffer.from(hexKey, 'hex');

  function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, encrypted, authTag]).toString('base64');
  }

  function decrypt(ciphertext: string): string {
    const data = Buffer.from(ciphertext, 'base64');

    const iv = data.subarray(0, 12);
    const authTag = data.subarray(data.length - 16);
    const encrypted = data.subarray(12, data.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  return { encrypt, decrypt, hashToken, generateToken };
}

/**
 * Creates HMAC auth helper functions using the same algorithms as InternalAuthService
 * but without requiring DI or env vars.
 */
export function createHmacAuthHelpers(secret: string) {
  function generateToken(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hmac = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
    return `${timestamp}:${hmac}`;
  }

  function verifyToken(token: string): boolean {
    const parts = token.split(':');
    if (parts.length !== 2) return false;
    const [timestamp, providedHmac] = parts;

    const now = Math.floor(Date.now() / 1000);
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Math.abs(now - tokenTime) > 300) return false;

    const expectedHmac = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedHmac, 'hex'),
        Buffer.from(expectedHmac, 'hex'),
      );
    } catch {
      return false;
    }
  }

  function generateSandboxToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHmac('sha256', secret).update(token).digest('hex');
    return { token, hash };
  }

  function verifySandboxToken(rawToken: string, storedHash: string): boolean {
    const computedHash = crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(storedHash, 'hex'),
      );
    } catch {
      return false;
    }
  }

  return { generateToken, verifyToken, generateSandboxToken, verifySandboxToken };
}
