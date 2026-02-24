# 12 - Settings Page Expansion

## Summary

Expand the existing settings page to include model preferences, secret management, integration settings, and repo image management.

## Reference

`scaffold/background-agents/packages/web/src/app/(app)/settings/page.tsx`

## Settings Categories

### Models
- List all available models grouped by provider
- Toggle enable/disable per model
- Set default model
- Visual indicator for currently enabled models

### Secrets
- **Repo Secrets**: per-repo environment variables
  - Repo selector → key/value list
  - Add/edit/delete secrets
  - Values masked (show only on explicit reveal)
- **Global Secrets**: org-wide environment variables
  - Same UI as repo secrets but not repo-scoped

### Integrations
- **GitHub**: App installation status, installed repos count
- **Slack**: Connection status, workspace name, configure channels
- **Linear**: Connection status, team mapping
- Each integration: enable/disable toggle, configuration form, test connection button

### Keyboard Shortcuts (existing enhancement)
- List of all keyboard shortcuts
- Customizable bindings (future)

### Data Controls
- Export session data
- Delete all sessions
- Account deletion

## Implementation Steps

1. Create settings section components in `apps/web/src/components/settings/`:
   - `ModelSettings.tsx`
   - `SecretSettings.tsx`
   - `IntegrationSettings.tsx`
   - `DataControlSettings.tsx`
2. Update existing settings page with tabbed/sectioned layout
3. Wire up oRPC queries and mutations for each section
4. Add confirmation dialogs for destructive actions

## Dependencies

- Task 04 (model preference, secret, integration routes)
- Task 06 (GitHub integration for status display)

## Acceptance Criteria

- All settings categories accessible via sidebar/tabs
- Model toggles persist immediately
- Secrets masked by default, revealable
- Integration status shows connection health
- Responsive layout
- Loading and error states
