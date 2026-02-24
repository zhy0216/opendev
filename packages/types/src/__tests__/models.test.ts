import { describe, it, expect } from 'bun:test';
import {
  ALL_MODELS,
  MODEL_GROUPS,
  DEFAULT_MODEL,
  getModelById,
  getModelsForProvider,
  REASONING_EFFORTS,
  type ModelDefinition,
  type ReasoningEffort,
} from '../models';

describe('Model Definitions', () => {
  it('ALL_MODELS contains all expected models', () => {
    const expectedIds = [
      'anthropic/claude-haiku-4-5',
      'anthropic/claude-sonnet-4-5',
      'anthropic/claude-sonnet-4-6',
      'anthropic/claude-opus-4-5',
      'anthropic/claude-opus-4-6',
      'openai/gpt-4.1',
      'openai/o3',
      'openai/codex-mini',
    ];

    expect(ALL_MODELS).toHaveLength(expectedIds.length);

    const actualIds = ALL_MODELS.map((m) => m.id);
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
  });

  it('DEFAULT_MODEL is claude-sonnet-4-6', () => {
    expect(DEFAULT_MODEL.id).toBe('anthropic/claude-sonnet-4-6');
    expect(DEFAULT_MODEL.name).toBe('Claude Sonnet 4.6');
    expect(DEFAULT_MODEL.isDefault).toBe(true);
  });

  it('MODEL_GROUPS has Anthropic and OpenAI groups', () => {
    expect(MODEL_GROUPS).toHaveLength(2);

    const providers = MODEL_GROUPS.map((g) => g.provider);
    expect(providers).toContain('anthropic');
    expect(providers).toContain('openai');

    const anthropicGroup = MODEL_GROUPS.find((g) => g.provider === 'anthropic');
    expect(anthropicGroup).toBeDefined();
    expect(anthropicGroup!.label).toBe('Anthropic');
    expect(anthropicGroup!.models).toHaveLength(5);

    const openaiGroup = MODEL_GROUPS.find((g) => g.provider === 'openai');
    expect(openaiGroup).toBeDefined();
    expect(openaiGroup!.label).toBe('OpenAI');
    expect(openaiGroup!.models).toHaveLength(3);
  });

  it('each model has required fields', () => {
    for (const model of ALL_MODELS) {
      expect(typeof model.id).toBe('string');
      expect(model.id.length).toBeGreaterThan(0);

      expect(typeof model.provider).toBe('string');
      expect(model.provider.length).toBeGreaterThan(0);

      expect(typeof model.name).toBe('string');
      expect(model.name.length).toBeGreaterThan(0);

      expect(Array.isArray(model.supportedReasoningEfforts)).toBe(true);
      expect(model.supportedReasoningEfforts.length).toBeGreaterThan(0);

      expect(typeof model.defaultReasoningEffort).toBe('string');
    }
  });

  it('each model has valid reasoning effort defaults', () => {
    const validEfforts: ReasoningEffort[] = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];

    for (const model of ALL_MODELS) {
      // defaultReasoningEffort must be a valid effort
      expect(validEfforts).toContain(model.defaultReasoningEffort);

      // Each supported effort must be valid
      for (const effort of model.supportedReasoningEfforts) {
        expect(validEfforts).toContain(effort);
      }
    }
  });

  it('default reasoning effort is in supported list', () => {
    for (const model of ALL_MODELS) {
      expect(model.supportedReasoningEfforts).toContain(model.defaultReasoningEffort);
    }
  });
});

describe('getModelById', () => {
  it('returns correct model for valid id', () => {
    const model = getModelById('anthropic/claude-sonnet-4-6');
    expect(model).toBeDefined();
    expect(model!.id).toBe('anthropic/claude-sonnet-4-6');
    expect(model!.name).toBe('Claude Sonnet 4.6');
    expect(model!.provider).toBe('anthropic');

    const gpt = getModelById('openai/gpt-4.1');
    expect(gpt).toBeDefined();
    expect(gpt!.name).toBe('GPT-4.1');
  });

  it('returns undefined for unknown id', () => {
    expect(getModelById('unknown/model')).toBeUndefined();
    expect(getModelById('')).toBeUndefined();
    expect(getModelById('anthropic/nonexistent')).toBeUndefined();
  });
});

describe('getModelsForProvider', () => {
  it('returns only Anthropic models', () => {
    const anthropicModels = getModelsForProvider('anthropic');
    expect(anthropicModels).toHaveLength(5);
    for (const model of anthropicModels) {
      expect(model.provider).toBe('anthropic');
    }
  });

  it('returns only OpenAI models', () => {
    const openaiModels = getModelsForProvider('openai');
    expect(openaiModels).toHaveLength(3);
    for (const model of openaiModels) {
      expect(model.provider).toBe('openai');
    }
  });

  it('returns empty array for unknown provider', () => {
    const models = getModelsForProvider('unknown');
    expect(models).toEqual([]);
    expect(models).toHaveLength(0);
  });
});

describe('REASONING_EFFORTS', () => {
  it('contains all 6 levels in order', () => {
    expect(REASONING_EFFORTS).toHaveLength(6);
    expect(REASONING_EFFORTS[0]).toBe('none');
    expect(REASONING_EFFORTS[1]).toBe('low');
    expect(REASONING_EFFORTS[2]).toBe('medium');
    expect(REASONING_EFFORTS[3]).toBe('high');
    expect(REASONING_EFFORTS[4]).toBe('xhigh');
    expect(REASONING_EFFORTS[5]).toBe('max');
  });
});
