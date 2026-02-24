import 'reflect-metadata';
import { injectable } from 'inversify';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { env } from '@repo/env';
import { IInternalAuthService } from '@repo/di';

export { IInternalAuthService };

@injectable()
export class InternalAuthService extends IInternalAuthService {
  private secret: string;

  constructor() {
    super();
    this.secret = env.INTERNAL_CALLBACK_SECRET;
  }

  generateToken(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hmac = createHmac('sha256', this.secret).update(timestamp).digest('hex');
    return `${timestamp}:${hmac}`;
  }

  verifyToken(token: string): boolean {
    const parts = token.split(':');
    if (parts.length !== 2) return false;
    const [timestamp, providedHmac] = parts;

    // Check time window (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Math.abs(now - tokenTime) > 300) return false;

    // Verify HMAC with timing-safe comparison
    const expectedHmac = createHmac('sha256', this.secret).update(timestamp).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(providedHmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
    } catch {
      return false;
    }
  }

  generateSandboxToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('hex');
    const hash = createHmac('sha256', this.secret).update(token).digest('hex');
    return { token, hash };
  }

  verifySandboxToken(rawToken: string, storedHash: string): boolean {
    const computedHash = createHmac('sha256', this.secret).update(rawToken).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
    } catch {
      return false;
    }
  }
}
