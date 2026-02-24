export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

export interface ModelDefinition {
  id: string;
  provider: string;
  name: string;
  description?: string;
  supportedReasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort;
  maxOutputTokens?: number;
  supportsExtendedThinking?: boolean;
  isDefault?: boolean;
}

export interface ModelGroup {
  provider: string;
  label: string;
  models: ModelDefinition[];
}

export const REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const satisfies ReasoningEffort[];

// ---------------------------------------------------------------------------
// Anthropic models
// ---------------------------------------------------------------------------

const claudeHaiku45: ModelDefinition = {
  id: "anthropic/claude-haiku-4-5",
  provider: "anthropic",
  name: "Claude Haiku 4.5",
  description: "Fast and cost-effective model for lightweight tasks",
  supportedReasoningEfforts: ["none", "low", "medium", "high"],
  defaultReasoningEffort: "none",
};

const claudeSonnet45: ModelDefinition = {
  id: "anthropic/claude-sonnet-4-5",
  provider: "anthropic",
  name: "Claude Sonnet 4.5",
  description: "Balanced model with strong reasoning capabilities",
  supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
  defaultReasoningEffort: "medium",
  supportsExtendedThinking: true,
};

const claudeSonnet46: ModelDefinition = {
  id: "anthropic/claude-sonnet-4-6",
  provider: "anthropic",
  name: "Claude Sonnet 4.6",
  description: "Latest balanced model with improved reasoning",
  supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
  defaultReasoningEffort: "medium",
  supportsExtendedThinking: true,
  isDefault: true,
};

const claudeOpus45: ModelDefinition = {
  id: "anthropic/claude-opus-4-5",
  provider: "anthropic",
  name: "Claude Opus 4.5",
  description: "Powerful model for complex analysis and generation",
  supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
  defaultReasoningEffort: "high",
  supportsExtendedThinking: true,
};

const claudeOpus46: ModelDefinition = {
  id: "anthropic/claude-opus-4-6",
  provider: "anthropic",
  name: "Claude Opus 4.6",
  description: "Most capable model for the hardest tasks",
  supportedReasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
  defaultReasoningEffort: "high",
  supportsExtendedThinking: true,
};

// ---------------------------------------------------------------------------
// OpenAI models
// ---------------------------------------------------------------------------

const gpt41: ModelDefinition = {
  id: "openai/gpt-4.1",
  provider: "openai",
  name: "GPT-4.1",
  description: "General-purpose OpenAI model",
  supportedReasoningEfforts: ["none"],
  defaultReasoningEffort: "none",
};

const o3: ModelDefinition = {
  id: "openai/o3",
  provider: "openai",
  name: "o3",
  description: "OpenAI reasoning model",
  supportedReasoningEfforts: ["low", "medium", "high"],
  defaultReasoningEffort: "medium",
};

const codexMini: ModelDefinition = {
  id: "openai/codex-mini",
  provider: "openai",
  name: "Codex Mini",
  description: "Code-specialized compact model",
  supportedReasoningEfforts: ["none", "low", "medium"],
  defaultReasoningEffort: "low",
};

// ---------------------------------------------------------------------------
// Aggregated exports
// ---------------------------------------------------------------------------

export const ALL_MODELS: ModelDefinition[] = [
  claudeHaiku45,
  claudeSonnet45,
  claudeSonnet46,
  claudeOpus45,
  claudeOpus46,
  gpt41,
  o3,
  codexMini,
];

export const MODEL_GROUPS: ModelGroup[] = [
  {
    provider: "anthropic",
    label: "Anthropic",
    models: [claudeHaiku45, claudeSonnet45, claudeSonnet46, claudeOpus45, claudeOpus46],
  },
  {
    provider: "openai",
    label: "OpenAI",
    models: [gpt41, o3, codexMini],
  },
];

export const DEFAULT_MODEL: ModelDefinition = claudeSonnet46;

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getModelById(id: string): ModelDefinition | undefined {
  return ALL_MODELS.find((model) => model.id === id);
}

export function getModelsForProvider(provider: string): ModelDefinition[] {
  return ALL_MODELS.filter((model) => model.provider === provider);
}
