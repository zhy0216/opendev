# 04 - Session API Routes (oRPC)

## Summary

Expose session management via oRPC routes, following the existing pattern of protected procedures with transaction middleware.

## Reference

`scaffold/background-agents/packages/control-plane/src/router.ts`

## Routes to Create

### `session.*`

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `session.list` | query | protected | List sessions for current user with filters (status, repo, archived) + pagination |
| `session.get` | query | protected | Get session by ID (checks participant membership) |
| `session.create` | mutation | protected | Create session (repo, model, reasoning_effort, optional initial prompt) |
| `session.delete` | mutation | protected | Delete session (owner only) |
| `session.archive` | mutation | protected | Archive session |
| `session.unarchive` | mutation | protected | Unarchive session |
| `session.prompt` | mutation | protected | Queue a new prompt in session |
| `session.stop` | mutation | protected | Stop current execution |
| `session.getEvents` | query | protected | Get events with cursor-based pagination |
| `session.getArtifacts` | query | protected | Get session artifacts |
| `session.getParticipants` | query | protected | Get session participants |
| `session.addParticipant` | mutation | protected | Add participant (owner/admin only) |
| `session.getMessages` | query | protected | Get message history |
| `session.createPR` | mutation | protected | Create GitHub PR from session |

### `secret.*`

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `secret.listRepo` | query | protected | List repo secrets (keys only, not values) |
| `secret.createRepo` | mutation | protected | Create/update repo secret |
| `secret.deleteRepo` | mutation | protected | Delete repo secret |
| `secret.listGlobal` | query | protected | List global secrets |
| `secret.createGlobal` | mutation | protected | Create/update global secret |
| `secret.deleteGlobal` | mutation | protected | Delete global secret |

### `modelPreference.*`

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `modelPreference.list` | query | protected | List enabled models |
| `modelPreference.update` | mutation | protected | Enable/disable models, set default |

### `integrationSetting.*`

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `integrationSetting.list` | query | protected | List integration settings |
| `integrationSetting.update` | mutation | protected | Update integration config |

## Input Validation (Zod)

All inputs validated with Zod schemas. Key schemas:
- `CreateSessionInput`: { repoOwner, repoName, model, reasoningEffort?, initialPrompt? }
- `QueuePromptInput`: { sessionId, content, model?, reasoningEffort?, attachments? }
- `CursorPaginationInput`: { cursor?: { timestamp, id }, limit? }

## Implementation Steps

1. Create route files in `packages/routes/src/`:
   - `session.routes.ts`
   - `secret.routes.ts`
   - `model-preference.routes.ts`
   - `integration-setting.routes.ts`
2. Add Zod validation schemas
3. Wire into main router (`packages/routes/src/index.ts`)
4. Test with existing oRPC client setup

## Dependencies

- Task 03 (repositories and use cases)

## Acceptance Criteria

- All routes use `protectedProcedure` (logging + transaction + auth middleware)
- Proper authorization checks (ownership, participant membership)
- Consistent `ResponseType<T>` return format
- Zod input validation on all mutations
