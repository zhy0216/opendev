# 16 - Internal Auth (Service-to-Service)

## Summary

Implement HMAC-based authentication for internal service-to-service communication. This is used when bots (Slack, GitHub, Linear) call the main API, and when sandboxes call back to report events.

## Reference

`scaffold/background-agents/packages/shared/src/auth.ts` (HMAC token generation)
`scaffold/background-agents/packages/control-plane/src/auth/` (verification)

## Architecture

### HMAC Token (Service-to-Service)
- Time-based HMAC token using `INTERNAL_CALLBACK_SECRET`
- Format: `timestamp:hmac(timestamp, secret)`
- Verification: check HMAC + timestamp within window (e.g., 5 minutes)
- Used by: web app → API, Slack bot → API, GitHub bot → API, Linear bot → API

### Sandbox Auth Token (Per-Session)
- Random token generated when sandbox is created
- SHA-256 hash stored in DB
- Sandbox sends raw token as Bearer auth
- Verified against stored hash
- Scoped to single session

## Implementation

```typescript
// packages/service/src/internal-auth.service.ts

class InternalAuthService {
  generateToken(): string;           // timestamp:hmac
  verifyToken(token: string): boolean;

  generateSandboxToken(): { token: string; hash: string };
  verifySandboxToken(sessionId: string, token: string): boolean;
}
```

### Middleware
- `internalAuthMiddleware` — verifies HMAC token for internal routes
- `sandboxAuthMiddleware` — verifies sandbox token for sandbox callback routes

## Implementation Steps

1. Add `INTERNAL_CALLBACK_SECRET` to env schema
2. Create `packages/service/src/internal-auth.service.ts`
3. Create middleware in `packages/routes/src/middleware/`
4. Add to DI container
5. Apply to appropriate routes

## Dependencies

- Task 08 (encryption service for hashing)

## Acceptance Criteria

- HMAC tokens generated with timestamp
- Token verification checks HMAC + time window
- Sandbox tokens generated and verified per-session
- Middleware blocks unauthenticated internal requests
- Replay protection via timestamp window
