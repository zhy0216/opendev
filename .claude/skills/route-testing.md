# Route Testing

Use this skill when writing route tests using MSW with oRPC in this project.

## Overview

We use **MSW (Mock Service Worker)** with **orpc-msw** for type-safe API mocking.

## Dependencies

```bash
bun add -d msw orpc-msw
```

## Basic Setup

### 1. Import Required Modules

```typescript
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from 'bun:test';
import { setupServer } from 'msw/node';
import { createMSWUtilities } from 'orpc-msw';
```

### 2. Configure MSW with oRPC Contract

```typescript
import { yourContract } from '@repo/types/your-contract';

const BASE_URL = 'http://localhost:3001';

const msw = createMSWUtilities({
  router: yourContract,
  baseUrl: BASE_URL,
});

const server = setupServer();
```

### 3. Lifecycle Hooks

```typescript
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

**Key Points**:
- `onUnhandledRequest: 'error'` - Fails on missing handlers
- `resetHandlers()` - Clears handlers between tests
- `close()` - Cleans up after all tests

## Writing Tests

### Simple GET Endpoint

```typescript
describe('Health endpoint', () => {
  test('should return health status', async () => {
    server.use(
      msw.health.handler(() => ({
        status: 'ok',
        timestamp: '2026-01-07T12:00:00.000Z',
        service: 'ingest',
      }))
    );

    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });
});
```

### POST Endpoint with Input Validation

```typescript
describe('Track endpoint', () => {
  test('should track event successfully', async () => {
    const mockEventId = 'evt_123456';

    server.use(
      msw.track.handler(({ input }) => {
        // Validate input within handler
        expect(input.eventType).toBe('user_signup');
        expect(input.email).toBe('test@example.com');
        
        return {
          success: true,
          eventId: mockEventId,
          deduplicated: false,
          flowsTriggered: 0,
        };
      })
    );

    const response = await fetch(`${BASE_URL}/api/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'vk_test_key_123',
      },
      body: JSON.stringify({
        eventType: 'user_signup',
        email: 'test@example.com',
        properties: { plan: 'premium' },
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.eventId).toBe(mockEventId);
  });
});
```

### Testing Different Scenarios

```typescript
test('should handle deduplicated events', async () => {
  server.use(
    msw.track.handler(() => ({
      success: true,
      eventId: 'evt_existing_123',
      deduplicated: true,
      flowsTriggered: 0,
    }))
  );

  const response = await fetch(`${BASE_URL}/api/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'vk_test_key_123',
    },
    body: JSON.stringify({
      eventType: 'user_signup',
      email: 'test@example.com',
      externalId: 'ext_123',
    }),
  });

  const data = await response.json();
  expect(data.deduplicated).toBe(true);
});
```

### Batch Operations

```typescript
describe('Batch endpoint', () => {
  test('should process batch events', async () => {
    server.use(
      msw.batch.handler(({ input }) => {
        expect(input.events.length).toBe(3);
        return {
          success: true,
          processed: 3,
          deduplicated: 0,
          total: 3,
        };
      })
    );

    const response = await fetch(`${BASE_URL}/api/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'vk_test_key_123',
      },
      body: JSON.stringify({
        events: [
          { eventType: 'page_view', email: 'user1@example.com' },
          { eventType: 'page_view', email: 'user2@example.com' },
          { eventType: 'click', email: 'user1@example.com' },
        ],
      }),
    });

    const data = await response.json();
    expect(data.processed).toBe(3);
  });
});
```

## Type Safety

```typescript
import {
  yourContract,
  type TrackResponse,
  type BatchResponse,
} from '@repo/types/your-contract';

// Cast response data for type safety
const data = (await response.json()) as TrackResponse;
```

## Best Practices

1. **One scenario per test** - Cover single behavior
2. **Descriptive names** - Use `should [expected behavior]` pattern
3. **Validate inputs in handlers** - Use `expect()` inside handlers
4. **Group related tests** - Nested `describe()` by endpoint
5. **Reset handlers** - Ensures test isolation
6. **Use `onUnhandledRequest: 'error'`** - Catches missing mocks
7. **Type responses** - Cast to contract types

## Running Tests

```bash
# All tests
bun test

# Specific file
bun test apps/ingest/src/index.test.ts
```
