# 18 - Repo Image Management

## Summary

Pre-built repository images allow sandboxes to start faster by skipping the clone + setup phase. This feature lets admins create and manage pre-built images for frequently used repos.

## Reference

`scaffold/background-agents/terraform/d1/migrations/0009_repo_images.sql`
`scaffold/background-agents/packages/control-plane/src/router.ts` (repo-images routes)

## Data Model

### `repo_image` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| repo_owner | text | |
| repo_name | text | |
| image_id | text | provider image/snapshot ID |
| base_sha | text | commit SHA the image was built from |
| status | text | building/ready/failed/expired |
| size_mb | integer | nullable |
| build_duration_ms | integer | nullable |
| created_by | text FK → user | |
| created_at | timestamp | |
| updated_at | timestamp | |

## API Routes

| Route | Description |
|-------|-------------|
| `repoImage.list` | List all repo images |
| `repoImage.create` | Trigger image build for a repo |
| `repoImage.delete` | Delete a repo image |
| `repoImage.rebuild` | Rebuild an existing image |

## Implementation Steps

1. Add schema to `packages/db/src/schemas/repo-image.schema.ts`
2. Create repository
3. Create routes
4. Add UI in settings page (Task 12)
5. Integrate with sandbox system (use image if available when spawning)

## Dependencies

- Task 01 (schema)
- Task 07 (sandbox system uses images)

## Acceptance Criteria

- Can create/list/delete repo images
- Sandbox system checks for available image before fresh clone
- Image staleness detection (warn if base_sha is old)
- Settings UI shows image status
