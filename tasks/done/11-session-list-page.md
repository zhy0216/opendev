# 11 - Session List Page

## Summary

Build a session list/history page showing all sessions the user has access to, with filtering, sorting, and status indicators.

## Reference

`scaffold/background-agents/packages/web/src/app/(app)/page.tsx` (sessions list section)

## Design

### Layout
- Table/card list of sessions
- Filters: status (active/completed/error/archived), repo, date range
- Sort: newest first (default), oldest, recently active
- Search by session name/title
- Pagination

### Session Card/Row
- Session name/title
- Repository (owner/name)
- Model used
- Status badge (color-coded)
- Created timestamp + duration
- Creator avatar
- Participant count
- Latest activity summary (last event type)
- Click → navigate to session view

### Status Badges
- `pending` — gray
- `active` — blue/pulsing
- `completed` — green
- `error` — red
- `archived` — muted

## Implementation Steps

1. Create `apps/web/src/components/session/SessionList.tsx`
2. Create `apps/web/src/components/session/SessionCard.tsx`
3. Create `apps/web/src/components/session/SessionFilters.tsx`
4. Create route at `apps/web/src/routes/dashboard/sessions.tsx`
5. Add to dashboard navigation
6. Wire up oRPC query with pagination and filters

## Dependencies

- Task 04 (session list API route)

## Acceptance Criteria

- Lists all accessible sessions with pagination
- Filter by status, repo works
- Search by name works
- Status badges correctly colored
- Responsive grid/list layout
- Empty state when no sessions
- Loading skeletons
