# 14 - GitHub Bot (PR Review & @mention)

## Summary

Handle GitHub webhooks for PR review requests and @mentions in issues/PRs. When users @mention the bot or request a review, it creates a session to analyze the code and post review comments.

## Reference

`scaffold/background-agents/packages/github-bot/src/index.ts`

## Features

### PR Review
1. When bot is added as PR reviewer or @mentioned in PR
2. Create session with PR context (repo, branch, diff)
3. Agent reviews code changes
4. Post review comments via GitHub API

### Issue @mention
1. When bot is @mentioned in an issue
2. Create session with issue context
3. Agent works on the issue
4. Post results as issue comment + optional PR link

## Webhook Events

| Event | Trigger | Action |
|-------|---------|--------|
| `pull_request_review_requested` | Bot added as reviewer | Create review session |
| `issue_comment.created` | @mention in issue/PR | Create task session |
| `pull_request.opened` | PR opened (if auto-review enabled) | Auto-review |

## Implementation Steps

1. Create webhook route: `POST /api/github/webhooks`
2. Verify GitHub webhook signature (HMAC SHA-256)
3. Create `packages/service/src/github-bot.service.ts`:
   - `handlePRReview(payload)`
   - `handleIssueMention(payload)`
   - `postReviewComment()`
   - `postIssueComment()`
4. Integrate with session creation flow
5. Add callback for posting results back to GitHub

## Dependencies

- Task 06 (GitHub service)
- Task 07 (sandbox system)

## Acceptance Criteria

- Webhook signature verification
- PR review requests create sessions
- @mentions in issues create sessions
- Review comments posted back to PR
- Issue comments posted with results
- Idempotency (don't create duplicate sessions for same event)
