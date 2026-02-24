# 15 - Linear Bot Integration

## Summary

Handle Linear webhooks to automatically create coding sessions from Linear issues. When an issue is assigned to the bot or has a specific label, create a session to work on it.

## Reference

`scaffold/background-agents/packages/linear-bot/src/index.ts`

## Features

### Issue Assignment
1. When bot user is assigned to a Linear issue
2. Extract issue details (title, description, linked PRs, project)
3. Determine repo from issue metadata or project settings
4. Create session with issue context
5. Post session link as Linear comment

### Label Trigger
1. When a specific label (e.g., "ai-agent") is added to an issue
2. Same flow as assignment trigger

### Completion Callback
- When session completes, update Linear issue:
  - Post comment with summary
  - Attach PR link
  - Optionally move issue to "In Review" state

## Implementation Steps

1. Create webhook route: `POST /api/linear/webhooks`
2. Verify Linear webhook signature
3. Create `packages/service/src/linear.service.ts`:
   - `handleIssueAssigned(payload)`
   - `handleLabelAdded(payload)`
   - `postComment(issueId, text)`
   - `updateIssueState(issueId, stateId)`
4. Add Linear API client setup (Linear SDK)
5. Integrate with session creation flow

## Dependencies

- Task 04 (session creation API)
- Task 07 (sandbox system)

## Acceptance Criteria

- Linear webhook verification
- Issue assignment creates session
- Label trigger creates session
- Comments posted back to Linear
- Issue state updated on completion
- Repo detection from issue/project metadata
