# 10 - Session View UI (Real-time Event Timeline)

## Summary

Build the session detail page that shows real-time agent activity. This is where users watch the agent work, see tool calls, code changes, and interact with follow-up prompts.

## Reference

`scaffold/background-agents/packages/web/src/app/(app)/session/[id]/page.tsx`
`scaffold/background-agents/packages/web/src/hooks/use-session-socket.ts`

## Layout

```
┌─────────────────────────────────────────────────────┐
│ Header: Session name | Repo | Branch | Status       │
├────────────────────────────────────┬────────────────┤
│                                    │ Sidebar:       │
│  Event Timeline                    │ - Details      │
│  ┌──────────────────────────┐     │ - Participants │
│  │ user_message (prompt)     │     │ - Artifacts    │
│  │ tool_call (file edit)     │     │ - Model info   │
│  │ tool_call (terminal)      │     │                │
│  │ token (streaming text)    │     │                │
│  │ git_sync (commit pushed)  │     │                │
│  │ execution_complete        │     │                │
│  └──────────────────────────┘     │                │
│                                    │                │
│  ┌──────────────────────────┐     │                │
│  │ Follow-up prompt input    │     │                │
│  │ [Model] [Effort] [Send]  │     │                │
│  └──────────────────────────┘     │                │
└────────────────────────────────────┴────────────────┘
```

## Key Components

### useSessionSocket Hook
Central real-time state management:
1. Fetch WebSocket auth token
2. Connect to `ws://host/ws/sessions/:id`
3. Subscribe with token
4. Process server messages → update local state
5. Ping/pong keepalive
6. Exponential backoff reconnection (max 5 attempts, 30s cap)
7. Token streaming optimization: accumulate tokens, render on execution_complete

### EventTimeline
- Scrollable list of events
- Auto-scroll to bottom on new events (unless user has scrolled up)
- Infinite scroll up for history (cursor-based pagination via WebSocket)
- Event types with distinct rendering:
  - `user_message`: prompt text with author avatar
  - `token`: markdown-rendered streamed text
  - `tool_call`: collapsible card showing tool name, args, output
  - `tool_result`: result of tool call (often grouped with tool_call)
  - `git_sync`: commit badge with SHA
  - `execution_complete`: success/error indicator
  - `error`: error message with stack trace (collapsible)

### ToolCallCard
- Grouped display: tool_call + tool_result as single card
- Collapsible: shows tool name + summary, expands to full args/output
- Syntax highlighted code blocks in output
- Special rendering for file edit tools (diff view)

### FollowUpPrompt
- Input at bottom of timeline
- Per-message model and reasoning effort override
- Submit sends prompt via WebSocket or oRPC mutation

### SessionSidebar
- Session metadata (repo, branch, created, duration)
- Participant list with online/offline indicators
- Artifact list (PRs with links, screenshots)
- Stop/Archive/Delete actions

### SandboxStatusBanner
- Shows sandbox lifecycle: warming → spawning → ready
- Error state with retry button
- Processing indicator (spinner when agent is working)

## Implementation Steps

1. Create `apps/web/src/hooks/use-session-socket.ts`
2. Create components in `apps/web/src/components/session/`:
   - `EventTimeline.tsx`
   - `EventItem.tsx` (dispatcher for event types)
   - `UserMessageEvent.tsx`
   - `TokenStreamEvent.tsx` (markdown rendering)
   - `ToolCallEvent.tsx` (collapsible card)
   - `GitSyncEvent.tsx`
   - `ExecutionCompleteEvent.tsx`
   - `ErrorEvent.tsx`
   - `FollowUpPrompt.tsx`
   - `SessionSidebar.tsx`
   - `SandboxStatusBanner.tsx`
   - `ParticipantList.tsx`
   - `ArtifactList.tsx`
3. Create route at `apps/web/src/routes/session/$sessionId.tsx`
4. Add markdown rendering (react-markdown + rehype-sanitize + remark-gfm)
5. Add syntax highlighting for code blocks (shiki or prism)

## Dependencies

- Task 04 (session API routes)
- Task 05 (WebSocket infrastructure)
- Task 09 (navigation from home page)

## Acceptance Criteria

- Real-time event streaming works
- All event types render correctly
- Scroll pagination loads history seamlessly
- Auto-scroll behavior (follows new events, pauses when user scrolls up)
- Follow-up prompts work
- Sidebar shows live participant presence
- Artifacts are clickable links
- Responsive (mobile: sidebar becomes bottom sheet)
- Reconnection works transparently
- Markdown rendered safely (sanitized)
- Code blocks syntax highlighted
