# 19 - Multiplayer Presence

## Summary

Enable multiple users to view the same session simultaneously with real-time presence indicators (who's online, typing, idle).

## Reference

`scaffold/background-agents/packages/web/src/hooks/use-session-socket.ts` (presence handling)
`scaffold/background-agents/packages/control-plane/src/session/durable-object.ts` (presence tracking)

## Features

### Presence States
- **active** — user is viewing the session
- **idle** — user hasn't interacted in 5+ minutes
- **typing** — user is composing a prompt

### Server-Side Tracking
- Track connected WebSocket clients per session
- Maintain `lastSeen` timestamp per participant
- Broadcast presence changes to all session clients

### Client-Side Display
- Avatar stack in session header showing online participants
- Tooltip with names and status
- Typing indicator when another user is composing

## Implementation Steps

1. Add presence tracking to `SessionRoomManager` (Task 05)
2. Handle `presence` and `typing` WebSocket messages
3. Broadcast `presence_sync`, `presence_update`, `presence_leave`
4. Create `PresenceIndicator.tsx` component
5. Add to session view header

## Dependencies

- Task 05 (WebSocket infrastructure)
- Task 10 (session view UI)

## Acceptance Criteria

- Online users shown as avatar stack
- Idle detection after 5 minutes of inactivity
- Typing indicator visible to other users
- Clean leave on disconnect
- Presence synced on reconnect
