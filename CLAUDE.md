# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run dev` | Start all dev servers (server + web) via Turborepo |
| `bun run build` | Build all packages |
| `bun run lint` | Run Biome linter across all packages |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Run database migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun test` | Run tests (Bun's built-in test runner) |
| `bun test path/to/file.test.ts` | Run a single test file |

## Architecture

This is a TypeScript monorepo (Turborepo + Bun workspaces) following Clean Architecture with dependency injection.

**Note:** The README mentions tRPC, but the codebase actually uses **oRPC** (`@orpc/server`, `@orpc/client`).

### Request Flow

```
Browser -> Vite Dev Proxy (/api, /rpc -> localhost:3000) -> Bun.serve()
  ├── /api/auth/*  -> Better Auth handler
  ├── /rpc/*       -> oRPC handler (RPCHandler)
  └── /health      -> Health check
```

### Backend Layers

```
oRPC Routes (packages/routes)
  │ Middleware: logging -> transaction -> auth
  ▼
Use Cases (packages/use-case)
  │ Business logic, orchestrates repositories
  ▼
Repositories (packages/repository)
  │ Data access via Drizzle ORM
  ▼
PostgreSQL (packages/db)
```

### Dependency Injection

Uses InversifyJS with **abstract class tokens** (not Symbols) as DI identifiers.

- Interfaces (abstract classes) defined in `packages/di/src/types.ts`
- Concrete implementations in their respective packages (`packages/repository`, `packages/use-case`, `packages/service`)
- Bindings registered in `packages/bootstrap/src/index.ts`
- Resolution: `getInject<ConcreteType>(IAbstractToken)` from `@repo/di`

### Transaction Management

The `transactionMiddleware` on protected routes:
1. Starts a PostgreSQL transaction
2. Creates a child InversifyJS container via `runWithTransaction()` with `AsyncLocalStorage`
3. Binds the transaction to `ITransaction` in the child container
4. Repositories auto-receive the transaction via `@inject(ITransaction) @optional()`
5. Falls back to global `IDatabase` connection when no transaction exists

### Frontend

React 18 + Vite + TanStack Router (file-based routing with auto code splitting) + TanStack React Query. oRPC client provides end-to-end type safety via `RouterClient<AppRouter>`. Auth uses Better Auth with email OTP (passwordless). The `cn()` utility (`clsx` + `tailwind-merge`) is in `apps/web/src/lib/utils.ts`.

### Design System

Supabase-inspired token system where shadcn/ui tokens map to scale variables. Key hierarchies:
- **Text:** `text-foreground` > `text-light` > `text-lighter` > `text-muted`
- **Surfaces:** `bg-background` > `bg-surface-100` > `bg-surface-200` > `bg-surface-300`
- **Borders:** `border-muted` > `border-border` > `border-strong` > `border-stronger`

## Key Patterns

### Adding a New Repository

1. Create schema in `packages/db/src/schemas/{entity}.schema.ts`, export from index
2. Add abstract class interface in `packages/di/src/types.ts`, export from index
3. Create implementation in `packages/repository/src/{entity}.repository.ts` with `@injectable()`, `@inject(ITransaction) @optional()`, and `BaseRepository` interface
4. Register binding in `packages/bootstrap/src/index.ts`

### Adding a New Use Case

1. Add abstract class interface in `packages/di/src/types.ts`, export from index
2. Create implementation in `packages/use-case/src/{domain}/{name}.use-case.ts` with `@injectable()` and `UseCase<Input, Output>` interface
3. Register binding in `packages/bootstrap/src/index.ts`

### Adding Environment Variables

1. Add Zod schema to `packages/env/src/env.ts`
2. Add to `.env` and `.env.example`
3. Access via `import { env } from '@repo/env'`

### oRPC Route Procedures

- `publicProcedure`: logging middleware only
- `protectedProcedure`: logging + transaction + auth middleware stack
- Input validation uses Zod schemas
- Return type: `ResponseType<T>` = `{ success: true; data: T } | { success: false; error: string }`

## Conventions

- **Package naming:** `@repo/<package-name>` (kebab-case)
- **File naming:** kebab-case (`user-repository.ts`)
- **DI pattern:** Always import `reflect-metadata` at top of `@injectable()` files
- **Formatter:** Biome
- **Workspace deps:** Use `"@repo/package": "workspace:*"` in `devDependencies`
- **TypeScript:** Strict mode, `experimentalDecorators` and `emitDecoratorMetadata` enabled (required for InversifyJS)
