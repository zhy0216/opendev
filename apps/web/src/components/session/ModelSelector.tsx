import { useState, useEffect, useRef } from 'react';
import {
  MODEL_GROUPS,
  ALL_MODELS,
  DEFAULT_MODEL,
  type ModelDefinition,
} from '@repo/types';
import { cn } from '../../lib/utils';

const STORAGE_KEY = 'session:model';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string, model: ModelDefinition) => void;
}

function loadStoredModelId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveModelId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel =
    ALL_MODELS.find((m) => m.id === value) ?? DEFAULT_MODEL;

  // Load persisted model on mount
  useEffect(() => {
    if (!initialized) {
      const storedId = loadStoredModelId();
      if (storedId) {
        const model = ALL_MODELS.find((m) => m.id === storedId);
        if (model && model.id !== value) {
          onChange(model.id, model);
        }
      }
      setInitialized(true);
    }
  }, [initialized, value, onChange]);

  // Persist changes
  useEffect(() => {
    if (initialized && value) {
      saveModelId(value);
    }
  }, [initialized, value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (model: ModelDefinition) => {
    onChange(model.id, model);
    setOpen(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Model
      </label>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm text-left',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white',
            'hover:border-gray-400 transition-colors'
          )}
        >
          <div className="min-w-0">
            <span className="font-medium text-gray-900">
              {selectedModel.name}
            </span>
            {selectedModel.description && (
              <span className="ml-2 text-gray-500 truncate">
                - {selectedModel.description}
              </span>
            )}
          </div>
          <svg
            className={cn(
              'h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform',
              open && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto">
            {MODEL_GROUPS.map((group) => (
              <div key={group.provider}>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  {group.label}
                </div>
                {group.models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(model)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors',
                      model.id === value && 'bg-blue-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'font-medium',
                          model.id === value
                            ? 'text-blue-700'
                            : 'text-gray-900'
                        )}
                      >
                        {model.name}
                      </span>
                      {model.id === value && (
                        <svg
                          className="h-4 w-4 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {model.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
