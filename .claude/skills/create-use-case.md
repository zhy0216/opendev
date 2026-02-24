# Create Use Case

Use this skill when creating new use cases for business logic in this project.

## Overview

Use cases encapsulate business logic and orchestrate repositories. They represent a single business operation. This project uses **abstract class tokens for dependency injection**.

## Checklist

1. Add interface in `packages/di/src/types.ts`
2. Export from `packages/di/src/index.ts`
3. Create implementation in `packages/use-case/src/{domain}/{name}.use-case.ts`
4. Export from `packages/use-case/src/index.ts`
5. Register in `packages/bootstrap/src/index.ts`

## Directory Structure

```
packages/use-case/src/
├── base.use-case.ts      # Base interface
├── index.ts              # Exports
└── {domain}/             # Domain-specific use cases
    └── {name}.use-case.ts
```

## Step 1: Add Interface to DI Types

Add to `packages/di/src/types.ts`:

```typescript
export abstract class IDoSomethingUseCase {
  abstract execute(input: unknown): Promise<unknown>;
}
```

Export from `packages/di/src/index.ts`:

```typescript
export { IDoSomethingUseCase } from './types';
```

## Step 2: Create Implementation

Create `packages/use-case/src/{domain}/{name}.use-case.ts`:

```typescript
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { IEntityRepository, IDoSomethingUseCase } from '@repo/di';
import type { EntityRepository, Entity } from '@repo/repository';
import type { UseCase } from '../base.use-case';

export interface DoSomethingInput {
  entityId: string;
  userId: string;
}

export interface DoSomethingOutput {
  success: boolean;
  data?: Entity;
}

@injectable()
export class DoSomethingUseCase
  implements UseCase<DoSomethingInput, DoSomethingOutput>
{
  constructor(
    @inject(IEntityRepository)
    private readonly entityRepository: EntityRepository
  ) {}

  async execute(input: DoSomethingInput): Promise<DoSomethingOutput> {
    const { entityId, userId } = input;
    
    // Business logic here
    const entity = await this.entityRepository.findById(entityId);
    
    if (!entity) {
      return { success: false };
    }
    
    return { success: true, data: entity };
  }
}
```

## Step 3: Register in Bootstrap

Add to `packages/bootstrap/src/index.ts`:

```typescript
import { IDoSomethingUseCase } from '@repo/di';
import { DoSomethingUseCase } from '@repo/use-case';

// In initializeContainer():
container.bind(IDoSomethingUseCase).to(DoSomethingUseCase);
```

## Step 4: Export from Index

Update `packages/use-case/src/index.ts`:

```typescript
export type { UseCase } from './base.use-case';
export * from './{domain}';
```

## Usage

```typescript
import { getInject, IDoSomethingUseCase } from '@repo/di';
import type { DoSomethingUseCase } from '@repo/use-case';

const useCase = getInject<DoSomethingUseCase>(IDoSomethingUseCase);
const result = await useCase.execute({ entityId: '...', userId: '...' });
```

## Testing

Create `packages/use-case/src/{domain}/{name}.use-case.test.ts`:

```typescript
import 'reflect-metadata';
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { DoSomethingUseCase } from './{name}.use-case';
import type { EntityRepository } from '@repo/repository';

describe('DoSomethingUseCase', () => {
  let useCase: DoSomethingUseCase;
  let mockRepository: EntityRepository;

  beforeEach(() => {
    mockRepository = {
      findById: mock(() => Promise.resolve({ id: 'test-id', name: 'Test' })),
      findAll: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve(null)),
      delete: mock(() => Promise.resolve(true)),
      exists: mock(() => Promise.resolve(true)),
    } as unknown as EntityRepository;

    useCase = new DoSomethingUseCase(mockRepository);
  });

  test('should do something successfully', async () => {
    const input = { entityId: 'test-id', userId: 'user-123' };
    const result = await useCase.execute(input);

    expect(result.success).toBe(true);
    expect(mockRepository.findById).toHaveBeenCalledWith('test-id');
  });

  test('should handle not found', async () => {
    mockRepository.findById = mock(() => Promise.resolve(undefined));

    const result = await useCase.execute({ entityId: 'missing', userId: 'user-123' });

    expect(result.success).toBe(false);
  });
});
```

## Key Points

- Import `reflect-metadata` at top
- Use `@injectable()` decorator
- Implement `UseCase<Input, Output>` interface
- Use `@inject(IRepositoryName)` for dependencies (abstract class tokens from `@repo/di`)
- Define typed `Input` and `Output` interfaces
- Keep use cases focused on single operations
- Define interface in `@repo/di`, implementation in `@repo/use-case`
