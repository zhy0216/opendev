# 13 - Slack Bot Integration

## Summary

Build a Slack bot that allows users to create and interact with coding sessions directly from Slack. Users can @mention the bot with a coding request, and it creates a session, runs the agent, and posts results back to the thread.

## Reference

`scaffold/background-agents/packages/slack-bot/src/index.ts`

## Architecture

The Slack bot runs as a separate service (or as a route handler in the main server) that:
1. Receives Slack events via webhook
2. Creates sessions via internal API
3. Posts session links and results back to Slack

### Option A: Separate Worker/Service
- Dedicated deployment (Cloudflare Worker, separate Bun process)
- Cleaner separation of concerns

### Option B: Routes in Main Server (Simpler MVP)
- Add `/api/slack/events` and `/api/slack/interactions` to existing Bun server
- Fewer moving parts

## Features

### @mention → Session Creation
1. User @mentions bot with a coding prompt
2. Bot classifies which repo the request is about (using LLM or keyword matching)
3. If repo is clear: creates session → sends prompt → posts "View Session" link
4. If ambiguous: shows repo selection dropdown → waits for user selection

### Thread Continuity
- Replies in the same Slack thread are forwarded as follow-up prompts to the same session
- Map Slack `thread_ts` → `sessionId` (store in DB or KV cache)

### User Preferences
- Per-user default model and reasoning effort
- Configurable via Slack App Home or slash command

### Completion Callbacks
- When a session completes, post summary to Slack thread
- Include: PR link (if created), brief summary of changes, token/cost info

## Implementation Steps

1. Create Slack App in Slack API dashboard
2. Add Slack env vars to `packages/env`
3. Create `packages/service/src/slack.service.ts`:
   - `verifySlackSignature()`
   - `postMessage()`, `postThreadReply()`
   - `showRepoSelector()` (Block Kit)
4. Create route handlers:
   - `POST /api/slack/events` — event subscription (app_mention, message)
   - `POST /api/slack/interactions` — block actions (button clicks, select)
5. Create repo classifier (simple keyword match or LLM-based)
6. Wire session creation flow
7. Add callback mechanism for session completion

## Dependencies

- Task 04 (session creation API)
- Task 07 (sandbox system for running agents)

## Acceptance Criteria

- Slack @mention creates a session
- Session link posted to Slack thread
- Thread replies become follow-up prompts
- Completion notification posted to thread
- Slack request signature verification
- Error handling (post error message to thread)
