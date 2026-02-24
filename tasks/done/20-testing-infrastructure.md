# 20 - Testing Infrastructure

## Summary

Set up comprehensive testing for the new features: unit tests for repositories and use cases, integration tests for API routes and WebSocket, and E2E tests for critical flows.

## Scope

### Unit Tests
- All new repositories (session, participant, message, event, artifact, sandbox, secret)
- All new use cases (CreateSession, QueuePrompt, CreatePR)
- EncryptionService
- InternalAuthService
- Model definitions helpers

### Integration Tests
- Session CRUD via oRPC routes
- WebSocket connection + message flow
- Secret management (encrypt/decrypt round-trip)
- Sandbox lifecycle (mock sandbox provider)

### E2E Tests (future)
- Create session → view events → follow-up prompt
- Slack bot: @mention → session creation
- GitHub bot: PR review request → review posted

## Implementation Steps

1. Create test fixtures and factories
2. Set up test database (in-memory SQLite or test PostgreSQL)
3. Write unit tests alongside implementation tasks
4. Write integration tests for API routes
5. Write WebSocket integration tests

## Dependencies

- All other tasks (tests written alongside implementation)

## Acceptance Criteria

- Test coverage for all new repositories and use cases
- Integration tests for critical API flows
- Tests run in CI (`bun test`)
- Test database isolation (no cross-test contamination)
