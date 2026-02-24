import { useCallback } from 'react';
import { cn } from '../../lib/utils';

const MAX_CHARS = 4000;

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: PromptInputProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!disabled && value.trim().length > 0) {
          onSubmit();
        }
      }
    },
    [disabled, value, onSubmit]
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Prompt
      </label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Describe what you'd like the agent to do..."
          rows={5}
          maxLength={MAX_CHARS}
          className={cn(
            'block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[120px]',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder:text-gray-400',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed'
          )}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {value.length}/{MAX_CHARS}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Cmd+Enter</kbd> to submit
      </p>
    </div>
  );
}
