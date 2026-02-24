import { describe, it, expect } from 'bun:test';
import crypto from 'node:crypto';
import {
  createEncryptionHelpers,
  TEST_ENCRYPTION_KEY,
} from './test-helpers';

describe('EncryptionService', () => {
  const helpers = createEncryptionHelpers(TEST_ENCRYPTION_KEY);

  describe('encrypt / decrypt roundtrip', () => {
    it('encrypts and decrypts correctly', () => {
      const plaintext = 'hello world, this is a secret message!';
      const ciphertext = helpers.encrypt(plaintext);
      const decrypted = helpers.decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('handles empty string', () => {
      const ciphertext = helpers.encrypt('');
      const decrypted = helpers.decrypt(ciphertext);
      expect(decrypted).toBe('');
    });

    it('handles unicode content', () => {
      const plaintext = 'Hello, \u4e16\u754c! \ud83c\udf0d \u00e9\u00e0\u00fc\u00f1';
      const ciphertext = helpers.encrypt(plaintext);
      const decrypted = helpers.decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('handles long content', () => {
      const plaintext = 'a'.repeat(10_000);
      const ciphertext = helpers.encrypt(plaintext);
      const decrypted = helpers.decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same message';
      const ciphertext1 = helpers.encrypt(plaintext);
      const ciphertext2 = helpers.encrypt(plaintext);

      // Ciphertexts should differ due to random IV
      expect(ciphertext1).not.toBe(ciphertext2);

      // But both should decrypt to the same plaintext
      expect(helpers.decrypt(ciphertext1)).toBe(plaintext);
      expect(helpers.decrypt(ciphertext2)).toBe(plaintext);
    });

    it('decryption fails with wrong key', () => {
      const differentKey = crypto.randomBytes(32).toString('hex');
      const otherHelpers = createEncryptionHelpers(differentKey);

      const plaintext = 'secret data';
      const ciphertext = helpers.encrypt(plaintext);

      // Decrypting with a different key should throw
      expect(() => otherHelpers.decrypt(ciphertext)).toThrow();
    });
  });

  describe('hashToken', () => {
    it('produces consistent SHA-256 hash', () => {
      const token = 'my-api-token-123';
      const hash1 = helpers.hashToken(token);
      const hash2 = helpers.hashToken(token);

      expect(hash1).toBe(hash2);
      // SHA-256 produces a 64-character hex string
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = helpers.hashToken('token-a');
      const hash2 = helpers.hashToken('token-b');

      expect(hash1).not.toBe(hash2);
    });

    it('matches known SHA-256 output', () => {
      // Verify against Node.js crypto directly
      const token = 'test-value';
      const expected = crypto.createHash('sha256').update(token).digest('hex');
      expect(helpers.hashToken(token)).toBe(expected);
    });
  });

  describe('generateToken', () => {
    it('generates 64-char hex string', () => {
      const token = helpers.generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(helpers.generateToken());
      }
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });
});
