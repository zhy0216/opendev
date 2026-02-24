# 01 - Data Models and Schemas

## Summary

Define the core database schemas for sessions, messages, events, artifacts, sandbox state, secrets, model preferences, and integration settings. This is the foundation everything else builds on.

## Reference

`scaffold/background-agents/packages/control-plane/src/session/schema.ts` (per-session DO SQLite)
`scaffold/background-agents/terraform/d1/migrations/` (global D1 tables)

## Schemas to Create

### `session` (core session table)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | auto-generated or user-provided |
| title | text | nullable, set after first prompt |
| repo_owner | text | GitHub org/user |
| repo_name | text | Repository name |
| repo_id | text | nullable, GitHub repo ID |
| branch_name | text | nullable, working branch |
| base_sha | text | nullable, base commit |
| current_sha | text | nullable, latest commit |
| model | text | e.g. `anthropic/claude-sonnet-4-6` |
| reasoning_effort | text | none/low/medium/high/xhigh/max |
| status | text | pending/active/completed/error/archived |
| created_by | text FK → user | session creator |
| organization_id | uuid FK → organization | nullable, org context |
| created_at | timestamp | |
| updated_at | timestamp | |

### `session_participant`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK → session | |
| user_id | text FK → user | |
| role | text | owner/collaborator/viewer |
| scm_login | text | nullable, GitHub username |
| joined_at | timestamp | |

### `session_message` (prompt queue)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK → session | |
| author_id | uuid FK → session_participant | |
| content | text | prompt text |
| source | text | web/slack/github/linear |
| model | text | nullable, per-message override |
| reasoning_effort | text | nullable, per-message override |
| attachments | jsonb | nullable |
| status | text | pending/processing/completed/failed |
| created_at | timestamp | |
| started_at | timestamp | nullable |
| completed_at | timestamp | nullable |

### `session_event` (agent event log)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK → session | |
| message_id | uuid FK → session_message | nullable |
| type | text | tool_call/tool_result/token/error/git_sync/execution_complete/user_message |
| data | jsonb | event payload |
| created_at | timestamp | |

### `session_artifact` (PRs, screenshots)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK → session | |
| type | text | pull_request/screenshot/file |
| url | text | |
| metadata | jsonb | nullable |
| created_at | timestamp | |

### `sandbox` (sandbox lifecycle state)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| session_id | uuid FK → session | unique |
| external_sandbox_id | text | nullable, provider sandbox ID |
| snapshot_id | text | nullable |
| auth_token_hash | text | SHA-256 of bearer token |
| status | text | pending/starting/running/stopping/stopped/error |
| last_heartbeat | timestamp | nullable |
| last_activity | timestamp | nullable |
| spawn_failure_count | integer | default 0 |
| last_spawn_failure | timestamp | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

### `repo_secret` (per-repo encrypted secrets)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| repo_owner | text | |
| repo_name | text | |
| key | text | env var name |
| encrypted_value | text | AES-256-GCM |
| created_by | text FK → user | |
| created_at | timestamp | |
| updated_at | timestamp | |

### `global_secret` (org-wide encrypted secrets)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK → organization | nullable |
| key | text | |
| encrypted_value | text | |
| created_by | text FK → user | |
| created_at | timestamp | |
| updated_at | timestamp | |

### `model_preference`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK → organization | nullable |
| model_id | text | e.g. `anthropic/claude-sonnet-4-6` |
| enabled | boolean | default true |
| is_default | boolean | default false |
| created_at | timestamp | |

### `integration_setting`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK → organization | nullable |
| type | text | slack/github/linear |
| config | jsonb | encrypted sensitive fields |
| enabled | boolean | default true |
| created_at | timestamp | |
| updated_at | timestamp | |

## Implementation Steps

1. Create schema files in `packages/db/src/schemas/`:
   - `session.schema.ts`
   - `sandbox.schema.ts`
   - `secret.schema.ts`
   - `model-preference.schema.ts`
   - `integration-setting.schema.ts`
2. Export all schemas from `packages/db/src/schemas/index.ts`
3. Run `bun run db:generate` to create migrations
4. Run `bun run db:migrate` to apply

## Dependencies

None — this is the first task.

## Acceptance Criteria

- All schemas defined with proper types, constraints, and foreign keys
- Migrations generated and applied successfully
- Indexes on frequently queried columns (session.status, session.created_by, session_event.session_id, etc.)
