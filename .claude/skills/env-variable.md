# Environment Variable Management

Use this skill when adding, updating, or deleting environment variables in this project.

## Overview

The project uses a type-safe environment system with:
- **@t3-oss/env-core** for validation
- **Zod** for schema definitions
- **TypeScript** for compile-time type safety
- Centralized in `@repo/env` package

## File Structure

```
packages/env/
└── src/
    ├── env.ts         # Environment schema & export
    └── index.ts       # Package exports
```

## Adding a New Variable

### Step 1: Update Schema

Edit `packages/env/src/env.ts`:

```typescript
export const env = createEnv({
  server: {
    // ... existing variables ...
    YOUR_VARIABLE_NAME: z.string().min(1, 'YOUR_VARIABLE_NAME is required'),
  },
  runtimeEnv: process.env,
});
```

### Common Zod Validators

```typescript
// Required string
MY_VAR: z.string().min(1, 'MY_VAR is required')

// Optional string
MY_VAR: z.string().optional()

// String with default
MY_VAR: z.string().default('default-value')

// Number (auto-converted)
MY_PORT: z.coerce.number().int().positive()

// Number with default
MY_PORT: z.coerce.number().int().positive().default(3000)

// Enum
MY_ENV: z.enum(['development', 'production', 'test'])

// URL validation
MY_URL: z.url()

// Boolean
MY_FLAG: z.coerce.boolean()
```

### Step 2: Add to .env

```bash
YOUR_VARIABLE_NAME=your-value-here
```

### Step 3: Add to .env.example

```bash
# Description of what this variable does
YOUR_VARIABLE_NAME=example-value
```

### Step 4: Rebuild

```bash
bun run build
```

### Step 5: Use in Code

```typescript
import { env } from '@repo/env';
console.log(env.YOUR_VARIABLE_NAME);
```

## Client-Side Variables

For client-side variables, use the `clientPrefix` option in `createEnv`:

```typescript
export const env = createEnv({
  server: { /* server vars */ },
  client: {
    VITE_PUBLIC_VAR: z.string(),
  },
  clientPrefix: 'VITE_',
  runtimeEnv: process.env,
});
```

**Security Warning**: Never expose:
- Database credentials
- API secrets
- Private keys
- Authentication tokens

## Updating a Variable

1. Modify validation in `packages/env/src/env.ts`
2. Update value in `.env`
3. Restart dev server

## Deleting a Variable

1. Remove from `packages/env/src/env.ts`
2. Remove from `.env` and `.env.example`
3. Search and remove usage: `grep -r "MY_VAR" apps/ packages/`
4. Restart dev server

## Troubleshooting

### Variable Not Found

```
Environment validation failed: - MY_VAR: Required
```

**Fix**: Check `.env` file, ensure exact name match, rebuild.

### Type Error

**Fix**: Ensure variable in `env.ts`, restart TS server.

## Summary

| Action | Files to Update | Command |
|--------|-----------------|---------|
| **Add** | `env.ts`, `.env`, `.env.example` | Restart dev |
| **Update** | `env.ts`, `.env` | Restart dev |
| **Delete** | `env.ts`, `.env`, remove usage | Restart dev |
