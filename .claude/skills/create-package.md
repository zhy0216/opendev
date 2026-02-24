# Create Package

Use this skill when creating a new package in this monorepo.

## Overview

- **Package Manager**: Bun (v1.3.5+)
- **Build Tool**: Turborepo
- **TypeScript**: v5.9+
- **Naming**: `@repo/<package-name>`
- **Location**: `packages/` directory

## Package Structure

```
packages/your-package/
├── src/
│   └── index.ts          # Main entry point
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # Documentation
```

## Step-by-Step Guide

### 1. Create Directory

```bash
mkdir packages/your-package
cd packages/your-package
```

### 2. Create package.json

```json
{
  "name": "@repo/your-package",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

### 3. Create tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Create Source Files

```bash
mkdir src
touch src/index.ts
```

```typescript
// src/index.ts
export const hello = () => {
  console.log('Hello from @repo/your-package');
};
```

### 5. Install Dependencies

```bash
cd ../..
bun install
```

### 6. Verify

```bash
bun run typecheck
```

## Package Types

### Library Package

For shared utilities:

```json
{
  "name": "@repo/utils",
  "exports": {
    ".": "./src/index.ts",
    "./string": "./src/string/index.ts"
  },
  "dependencies": {}
}
```

### Service Package (with DI)

For services with dependency injection:

```json
{
  "name": "@repo/my-service",
  "dependencies": {
    "inversify": "^7.0.0",
    "reflect-metadata": "^0.2.2"
  },
  "devDependencies": {
    "@repo/db": "workspace:*",
    "@repo/di": "workspace:*"
  }
}
```

```typescript
// src/interfaces/my-service.ts
export abstract class IMyService {
  abstract doSomething(): Promise<void>;
}

// src/my-service.ts
import { injectable } from 'inversify';
import 'reflect-metadata';
import { IMyService } from './interfaces/my-service';

@injectable()
export class MyService extends IMyService {
  async doSomething(): Promise<void> {
    // Implementation
  }
}
```

### Repository Package

For data access:

```json
{
  "dependencies": {
    "inversify": "^7.0.0",
    "reflect-metadata": "^0.2.2",
    "drizzle-orm": "^0.38.0"
  },
  "devDependencies": {
    "@repo/db": "workspace:*",
    "@repo/di": "workspace:*"
  }
}
```

### React Component Package

```json
{
  "name": "@repo/ui",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/components/button.tsx"
  },
  "dependencies": {
    "react": "^19.0.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

## Best Practices

### Naming

- Package names: kebab-case (`@repo/my-package`)
- File names: kebab-case (`user-repository.ts`)
- Classes: PascalCase (`UserRepository`)
- Functions: camelCase (`findUserById`)

### Exports

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts"
  }
}
```

### Dependencies

```json
{
  "devDependencies": {
    "@repo/db": "workspace:*",
    "@repo/di": "workspace:*"
  }
}
```

### Testing

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch"
  }
}
```

## Code Style

- **Indent**: 2 spaces (tabs in some files)
- **Quotes**: Single for JS/TS, double for JSX
- **Semicolons**: Always
- **Formatter**: Biome

## Troubleshooting

### Package not found

1. Check name in root workspaces
2. Run `bun install` from root
3. Verify package.json name

### TypeScript errors

1. Verify tsconfig extends correct base
2. Run `bun run typecheck`
3. Check dependencies installed

### Build errors

1. Check outDir/rootDir settings
2. Verify imports are correct
3. Run build from package directory
