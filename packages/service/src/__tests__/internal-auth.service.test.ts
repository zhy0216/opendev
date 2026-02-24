import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
  createHmacAuthHelpers,
  TEST_HMAC_SECRET,
} from './test-helpers';

describe('InternalAuthService', () => {
  const auth = createHmacAuthHelpers(TEST_HMAC_SECRET);

  describe('generateToken / verifyToken roundtrip', () => {
    it('generated token verifies successfully', () => {
      const token = auth.generateToken();
      expect(auth.verifyToken(token)).toBe(true);
    });

    it('rejects tampered token', () => {
      const token = auth.generateToken();
      const [timestamp, hmac] = token.split(':');

      // Tamper with the HMAC portion
      const tamperedHmac = hmac.replace(/^./, hmac[0] === 'a' ? 'b' : 'a');
      const tamperedToken = `${timestamp}:${tamperedHmac}`;

      expect(auth.verifyToken(tamperedToken)).toBe(false);
    });

    it('rejects expired token (mock Date.now)', () => {
      // Generate a token at current time
      const token = auth.generateToken();

      // Save original Date.now
      const originalNow = Date.now;

      try {
        // Advance time by 6 minutes (360 seconds) -- beyond the 5-minute window
        Date.now = () => originalNow() + 360 * 1000;

        expect(auth.verifyToken(token)).toBe(false);
      } finally {
        // Restore Date.now
        Date.now = originalNow;
      }
    });

    it('accepts token within 5-minute window', () => {
      const token = auth.generateToken();

      const originalNow = Date.now;

      try {
        // Advance time by 4 minutes (240 seconds) -- within the 5-minute window
        Date.now = () => originalNow() + 240 * 1000;

        expect(auth.verifyToken(token)).toBe(true);
      } finally {
        Date.now = originalNow;
      }
    });

    it('rejects malformed token', () => {
      expect(auth.verifyToken('')).toBe(false);
      expect(auth.verifyToken('no-colon-here')).toBe(false);
      expect(auth.verifyToken('too:many:colons')).toBe(false);
      expect(auth.verifyToken(':empty-timestamp')).toBe(false);
      expect(auth.verifyToken('not-a-number:abcdef1234')).toBe(false);
    });

    it('token format is timestamp:hmac', () => {
      const token = auth.generateToken();
      const parts = token.split(':');

      expect(parts).toHaveLength(2);

      const [timestamp, hmac] = parts;
      // Timestamp should be a valid number
      expect(Number.isNaN(parseInt(timestamp, 10))).toBe(false);
      // HMAC should be a 64-char hex string (SHA-256)
      expect(hmac).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('sandbox tokens', () => {
    it('generateSandboxToken returns token and hash', () => {
      const result = auth.generateSandboxToken();

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('hash');

      // Token is 64-char hex (32 random bytes)
      expect(result.token).toHaveLength(64);
      expect(result.token).toMatch(/^[0-9a-f]{64}$/);

      // Hash is 64-char hex (SHA-256 HMAC)
      expect(result.hash).toHaveLength(64);
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('verifySandboxToken validates correctly', () => {
      const { token, hash } = auth.generateSandboxToken();
      expect(auth.verifySandboxToken(token, hash)).toBe(true);
    });

    it('verifySandboxToken rejects wrong token', () => {
      const { hash } = auth.generateSandboxToken();
      const wrongToken = 'a'.repeat(64);
      expect(auth.verifySandboxToken(wrongToken, hash)).toBe(false);
    });

    it('verifySandboxToken rejects wrong hash', () => {
      const { token } = auth.generateSandboxToken();
      const wrongHash = 'b'.repeat(64);
      expect(auth.verifySandboxToken(token, wrongHash)).toBe(false);
    });

    it('generates unique sandbox tokens each time', () => {
      const results = Array.from({ length: 50 }, () => auth.generateSandboxToken());
      const tokens = new Set(results.map((r) => r.token));
      const hashes = new Set(results.map((r) => r.hash));

      expect(tokens.size).toBe(50);
      expect(hashes.size).toBe(50);
    });

    it('different secrets produce different hashes for same token', () => {
      const otherAuth = createHmacAuthHelpers('different-secret');
      const { token, hash } = auth.generateSandboxToken();

      // Verification with a different secret should fail
      expect(otherAuth.verifySandboxToken(token, hash)).toBe(false);
    });
  });
});
