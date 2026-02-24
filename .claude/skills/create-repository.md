# Create Repository

Use this skill when creating new repositories for database entities in this project.

## Overview

This project uses **abstract class tokens for dependency injection** (not Symbol-based identifiers). Repositories extend abstract class interfaces and support optional transaction injection.

## Checklist

1. Create schema in `packages/db/src/schemas/{entity}.schema.ts`
2. Export from `packages/db/src/schemas/index.ts`
3. Add interface in `packages/di/src/types.ts`
4. Export from `packages/di/src/index.ts`
5. Create implementation in `packages/repository/src/{entity}.repository.ts`
6. Export from `packages/repository/src/index.ts`
7. Register in `packages/bootstrap/src/index.ts`

## Step 1: Define Schema

Create `packages/db/src/schemas/{entity}.schema.ts`:

```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const entity = pgTable('entity', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});
```

## Step 2: Add Interface to DI Types

Add to `packages/di/src/types.ts`:

```typescript
export abstract class IEntityRepository {
  abstract findById(id: string): Promise<unknown>;
  abstract findAll(): Promise<unknown[]>;
  abstract findOne(filter: unknown): Promise<unknown>;
  abstract create(data: unknown): Promise<unknown>;
  abstract update(id: string, data: unknown): Promise<unknown>;
  abstract delete(id: string): Promise<boolean>;
  abstract exists(id: string): Promise<boolean>;
}
```

Export from `packages/di/src/index.ts`:

```typescript
export { IEntityRepository } from './types';
```

## Step 3: Create Implementation

Create `packages/repository/src/{entity}.repository.ts`:

```typescript
import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq } from 'drizzle-orm';
import { entity, type DbClient } from '@repo/db';
import type { BaseRepository } from './base.repository';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type Entity = typeof entity.$inferSelect;
export type EntityCreate = Omit<typeof entity.$inferInsert, 'createdAt' | 'updatedAt'>;
export type EntityUpdate = Partial<Omit<EntityCreate, 'id'>>;

@injectable()
export class EntityRepository
  implements BaseRepository<Entity, EntityCreate, EntityUpdate>
{
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async findById(id: string): Promise<Entity | undefined> {
    const result = await this.dbClient
      .select()
      .from(entity)
      .where(eq(entity.id, id))
      .limit(1);
    return result[0];
  }

  async findAll(): Promise<Entity[]> {
    return await this.dbClient.select().from(entity);
  }

  async findOne(filter: Partial<Entity>): Promise<Entity | undefined> {
    const results = await this.findAll();
    return results.find((e) =>
      Object.entries(filter).every(
        ([key, value]) => e[key as keyof Entity] === value
      )
    );
  }

  async create(data: EntityCreate): Promise<Entity> {
    const result = await this.dbClient.insert(entity).values(data).returning();
    return result[0];
  }

  async update(id: string, data: EntityUpdate): Promise<Entity | undefined> {
    const result = await this.dbClient
      .update(entity)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(entity.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(entity)
      .where(eq(entity.id, id))
      .returning();
    return result.length > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== undefined;
  }
}
```

## Step 4: Register in Bootstrap

Add to `packages/bootstrap/src/index.ts`:

```typescript
import { IEntityRepository } from '@repo/di';
import { EntityRepository } from '@repo/repository';

// In initializeContainer():
container.bind(IEntityRepository).to(EntityRepository);
```

## Usage

```typescript
import { getInject, IEntityRepository } from '@repo/di';
import type { EntityRepository } from '@repo/repository';

const repo = getInject<EntityRepository>(IEntityRepository);

// CRUD operations
const item = await repo.create({ name: 'Test' });
const found = await repo.findById(item.id);
await repo.update(item.id, { name: 'Updated' });
await repo.delete(item.id);
```

## Transaction Support

```typescript
import { getInject, runWithTransaction, IDatabase, IEntityRepository } from '@repo/di';
import type { DbClient } from '@repo/db';

const db = getInject<DbClient>(IDatabase);

await db.transaction(async (tx) => {
  return await runWithTransaction(tx, async () => {
    const repo = getInject(IEntityRepository);
    // All operations use the transaction
    await repo.create({ name: 'Test' });
    await repo.update('id', { name: 'Updated' });
  });
});
```

## Key Points

- Always import `reflect-metadata` at top of implementation files
- Use `@injectable()` decorator on the class
- Implement `BaseRepository` interface
- Use `@inject(ITransaction) @optional()` for transaction injection
- Use `this.dbClient = transaction ?? getInject<DbClient>(IDatabase)` pattern
- Always update `updatedAt` in update methods
- Define interface in `@repo/di`, implementation in `@repo/repository`
