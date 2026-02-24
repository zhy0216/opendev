# 03 - Session Repository and Use Cases

## Summary

Build the data access layer and business logic for session management: CRUD operations, participant management, message queuing, event logging, and artifact tracking.

## Reference

`scaffold/background-agents/packages/control-plane/src/session/durable-object.ts` (session state)
`scaffold/background-agents/packages/control-plane/src/router.ts` (API handlers)

## Repositories to Create

### SessionRepository
- `create(data)` → session
- `findById(id)` → session | null
- `findByUserId(userId, filters?)` → session[] (with pagination)
- `update(id, data)` → session
- `delete(id)` → void
- `updateStatus(id, status)` → void
- `archive(id)` / `unarchive(id)`

### SessionParticipantRepository
- `add(sessionId, userId, role)` → participant
- `remove(sessionId, userId)` → void
- `findBySession(sessionId)` → participant[]
- `findMembership(sessionId, userId)` → participant | null

### SessionMessageRepository
- `create(data)` → message
- `findBySession(sessionId, pagination?)` → message[]
- `findPending(sessionId)` → message[] (ordered by created_at)
- `updateStatus(id, status)` → void

### SessionEventRepository
- `create(data)` → event
- `findBySession(sessionId, cursor?, limit?)` → event[] (cursor-based pagination)
- `findByMessage(messageId)` → event[]

### SessionArtifactRepository
- `create(data)` → artifact
- `findBySession(sessionId)` → artifact[]
- `update(id, data)` → artifact

### SecretRepository
- `createRepoSecret(data)` → secret
- `getRepoSecrets(repoOwner, repoName)` → secret[]
- `deleteRepoSecret(id)` → void
- `createGlobalSecret(data)` → secret
- `getGlobalSecrets(orgId?)` → secret[]
- `deleteGlobalSecret(id)` → void

## Use Cases to Create

### CreateSessionUseCase
1. Validate repo access
2. Create session record
3. Add creator as owner participant
4. Return session with participant info

### QueuePromptUseCase
1. Verify user is session participant
2. Create message record (status: pending)
3. Trigger sandbox prompt delivery (emit event)
4. Return message

### CreatePullRequestUseCase
1. Verify session has commits (current_sha != base_sha)
2. Call GitHub API to create PR
3. Create artifact record
4. Return artifact

## Implementation Steps

1. Add abstract class interfaces to `packages/di/src/types.ts`
2. Implement repositories in `packages/repository/src/`
3. Implement use cases in `packages/use-case/src/session/`
4. Register bindings in `packages/bootstrap/src/index.ts`
5. Write unit tests

## Dependencies

- Task 01 (schemas)

## Acceptance Criteria

- All repositories with proper transaction support via `@inject(ITransaction) @optional()`
- Cursor-based pagination for events (essential for real-time + history loading)
- Use cases enforce authorization (participant checks)
- All registered in DI container
