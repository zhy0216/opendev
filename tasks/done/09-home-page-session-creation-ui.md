# 09 - Home Page: Session Creation UI

## Summary

Replace the current marketing landing page with an authenticated home page that lets users create new coding sessions. This is the primary entry point for starting agent work.

## Reference

`scaffold/background-agents/packages/web/src/app/(app)/page.tsx` (home page)
`scaffold/background-agents/packages/web/src/components/` (UI components)

## Design

### Layout
- Full-height centered layout
- Repository selector (combobox/dropdown)
- Model selector (grouped by provider)
- Reasoning effort selector (pill buttons)
- Large prompt textarea
- "Start Session" button
- Recent sessions sidebar or below-fold list

### Components

#### RepoSelector
- Searchable combobox/dropdown
- Fetches repos from `repo.list` oRPC route
- Shows org/repo format with repo description
- Persists last selection to localStorage
- Loading skeleton while fetching

#### ModelSelector
- Grouped dropdown (Anthropic / OpenAI / Open Source)
- Shows model name + short description
- Disabled models grayed out (based on model preferences)
- Persists last selection to localStorage

#### ReasoningEffortPills
- Horizontal pill buttons: none | low | medium | high | max
- Availability depends on selected model
- Default from model definition
- Visual feedback for selected state

#### PromptInput
- Large textarea with placeholder text
- Markdown support hint
- Attachment support (future: file upload)
- Submit on Cmd/Ctrl+Enter
- Character count

### Behavior
1. User selects repo → model → reasoning effort
2. User types prompt
3. On submit: calls `session.create` mutation
4. On success: navigates to `/session/:id`
5. Proactive sandbox warming: optionally create session on first keystroke (advanced, deferred)

### Recent Sessions
- Show last 5-10 sessions below the creation form
- Quick status indicators (active/completed/error)
- Click to navigate to session view

## Implementation Steps

1. Create components in `apps/web/src/components/session/`:
   - `RepoSelector.tsx`
   - `ModelSelector.tsx`
   - `ReasoningEffortPills.tsx`
   - `PromptInput.tsx`
   - `RecentSessions.tsx`
2. Create route at `apps/web/src/routes/dashboard/index.tsx` (replace current overview)
3. Add oRPC query hooks for repo list, session list
4. Add oRPC mutation for session creation
5. Handle navigation on session create success
6. Add localStorage persistence for selections

## Dependencies

- Task 02 (model definitions for selector)
- Task 04 (session and repo API routes)

## Acceptance Criteria

- Repo selector loads and filters repos
- Model selector shows grouped models with availability
- Reasoning effort pills adapt to selected model
- Prompt submission creates session and navigates
- Recent sessions show with status indicators
- Responsive design (mobile-friendly)
- Selections persisted across page loads
