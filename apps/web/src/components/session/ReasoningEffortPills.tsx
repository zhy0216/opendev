import type { ModelDefinition } from '@repo/types';
import { cn } from '../../lib/utils';

const EFFORT_LABELS: Record<string, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra High',
  max: 'Max',
};

interface ReasoningEffortPillsProps {
  selectedModel: ModelDefinition;
  value: string;
  onChange: (value: string) => void;
}

export function ReasoningEffortPills({
  selectedModel,
  value,
  onChange,
}: ReasoningEffortPillsProps) {
  const efforts = selectedModel.supportedReasoningEfforts;

  // If only one option, no need to render pills
  if (efforts.length <= 1) {
    return null;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Reasoning Effort
      </label>
      <div className="flex flex-wrap gap-2">
        {efforts.map((effort) => {
          const isSelected = effort === value;
          return (
            <button
              key={effort}
              type="button"
              onClick={() => onChange(effort)}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                'border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              )}
            >
              {EFFORT_LABELS[effort] ?? effort}
            </button>
          );
        })}
      </div>
    </div>
  );
}
