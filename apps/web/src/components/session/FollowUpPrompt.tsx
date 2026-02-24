import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface FollowUpPromptProps {
  onSubmit: (content: string) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  onTyping?: (isTyping: boolean) => void;
}

const TYPING_DEBOUNCE_MS = 2_000;

export function FollowUpPrompt({
  onSubmit,
  disabled = false,
  isProcessing = false,
  onTyping,
}: FollowUpPromptProps) {
  const [value, setValue] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping?.(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after debounce period
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping?.(false);
    }, TYPING_DEBOUNCE_MS);
  }, [onTyping]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      if (e.target.value.length > 0) {
        handleTypingStart();
      } else {
        // Cleared the input, stop typing
        if (isTypingRef.current) {
          isTypingRef.current = false;
          onTyping?.(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
        }
      }
    },
    [handleTypingStart, onTyping]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');

    // Stop typing indicator on submit
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping?.(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [value, disabled, onSubmit, onTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            isProcessing
              ? 'Wait for the agent to finish...'
              : 'Send a follow-up message...'
          }
          rows={1}
          className={cn(
            'flex-1 block border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder:text-gray-400',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed'
          )}
          style={{ minHeight: '38px', maxHeight: '120px' }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={cn(
            'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            'bg-blue-600 text-white hover:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Cmd+Enter</kbd> to send
      </p>
    </div>
  );
}
