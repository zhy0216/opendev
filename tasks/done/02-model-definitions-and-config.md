# 02 - Model Definitions and Configuration

## Summary

Create a shared model definitions module that defines all supported AI models, their capabilities, reasoning effort levels, and provider groupings. This is used throughout the stack (session creation, model selector UI, sandbox configuration).

## Reference

`scaffold/background-agents/packages/shared/src/models.ts`

## Models to Support

### Anthropic
- claude-haiku-4-5
- claude-sonnet-4-5
- claude-sonnet-4-6
- claude-opus-4-5
- claude-opus-4-6

### OpenAI
- gpt-4.1
- o3
- codex-mini

### Open Source (future)
- Placeholder group for self-hosted models

## Data Structure

```typescript
interface ModelDefinition {
  id: string;               // e.g. "anthropic/claude-sonnet-4-6"
  provider: string;         // "anthropic" | "openai" | "open-source"
  name: string;             // Display name
  description?: string;
  supportedReasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort;
  maxOutputTokens?: number;
  supportsExtendedThinking?: boolean;
  isDefault?: boolean;
}

type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

interface ModelGroup {
  provider: string;
  label: string;
  models: ModelDefinition[];
}
```

## Implementation Steps

1. Create `packages/types/src/models.ts` with types and constants
2. Export `ALL_MODELS`, `MODEL_GROUPS`, `DEFAULT_MODEL`, `getModelById()`, `getModelsForProvider()`
3. Export `REASONING_EFFORTS` array and helpers
4. Add to `packages/types` exports

## Dependencies

None.

## Acceptance Criteria

- All model definitions with provider, capabilities, reasoning effort config
- Helper functions for lookup and filtering
- Default model set to `anthropic/claude-sonnet-4-6`
- Types exported for use in frontend and backend
