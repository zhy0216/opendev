# repo

A TypeScript monorepo with tRPC, Drizzle, and InversifyJS

## Tech Stack

- **Monorepo**: Turborepo + Bun workspaces
- **API**: tRPC with automatic transaction management
- **Database**: Drizzle ORM with PostgreSQL
- **Auth**: Better Auth with Drizzle adapter
- **DI**: InversifyJS with request-scoped transactions via AsyncLocalStorage
- **Frontend**: Vite + React + TanStack Router

## Project Structure

```
├── apps/
│   ├── server/          # Bun tRPC server
│   └── web/             # Vite React frontend
├── packages/
│   ├── auth/            # Better Auth configuration
│   ├── bootstrap/       # DI container initialization
│   ├── db/              # Drizzle ORM schemas & migrations
│   ├── di/              # Dependency injection (InversifyJS)
│   ├── env/             # Type-safe environment variables
│   ├── repository/      # Data access layer
│   ├── routes/          # tRPC routers & procedures
│   ├── service/         # Business logic services
│   ├── use-case/        # Application use cases
│   └── types/           # Shared TypeScript types
└── package.json
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3.5
- PostgreSQL database

### Installation

1. Install dependencies:
   ```bash
   bun install
   ```

2. Copy environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. Generate and run database migrations:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

4. Start development servers:
   ```bash
   bun run dev
   ```

## Available Scripts

- `bun run dev` - Start all development servers
- `bun run build` - Build all packages
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio

## Architecture

### Transaction Flow

1. Request arrives → tRPC handler
2. Transaction middleware starts DB transaction
3. Child DI container created with transaction bound
4. Repositories resolved from child container get the transaction
5. On success → transaction commits
6. On error → transaction rolls back

This ensures all database operations within a single request share the same transaction.
