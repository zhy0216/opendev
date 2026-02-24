# 08 - Encryption Service

## Summary

Create an encryption service for securing sensitive data at rest: user tokens, repository secrets, global secrets, and sandbox auth tokens.

## Reference

`scaffold/background-agents/packages/shared/src/encryption.ts` (AES-256-GCM)

## Implementation

### EncryptionService
```typescript
class EncryptionService {
  constructor(private encryptionKey: string); // from TOKEN_ENCRYPTION_KEY env

  encrypt(plaintext: string): string;  // returns base64(iv + ciphertext + tag)
  decrypt(ciphertext: string): string;

  // Convenience
  hashToken(token: string): string;  // SHA-256 for token storage
  generateToken(): string;           // crypto random token
}
```

### Encryption Approach
- **AES-256-GCM** for reversible encryption (secrets, OAuth tokens)
- **SHA-256** for irreversible hashing (WebSocket tokens, sandbox auth tokens)
- 12-byte random IV per encryption operation
- Key derived from `TOKEN_ENCRYPTION_KEY` env var

## Environment Variables

Add to `packages/env/src/env.ts`:
- `TOKEN_ENCRYPTION_KEY` — 32-byte hex key for AES-256-GCM

## Implementation Steps

1. Add `TOKEN_ENCRYPTION_KEY` to env schema
2. Create `packages/service/src/encryption.service.ts`
3. Add abstract interface to DI types
4. Register in bootstrap
5. Use in SecretRepository and token storage
6. Write tests with known test vectors

## Dependencies

None (but used by Tasks 03, 06, 07).

## Acceptance Criteria

- AES-256-GCM encryption/decryption working
- SHA-256 hashing for tokens
- Secure random token generation
- Test vectors validate correctness
- Key rotation strategy documented (future)
