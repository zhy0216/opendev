import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../lib/auth';
import { orpc } from '../../orpc';
import { DEFAULT_MODEL, type ModelDefinition } from '@repo/types';
import { RepoSelector } from '../../components/session/RepoSelector';
import { ModelSelector } from '../../components/session/ModelSelector';
import { ReasoningEffortPills } from '../../components/session/ReasoningEffortPills';
import { PromptInput } from '../../components/session/PromptInput';
import { RecentSessions } from '../../components/session/RecentSessions';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id);
  const [selectedModel, setSelectedModel] = useState<ModelDefinition>(DEFAULT_MODEL);
  const [reasoningEffort, setReasoningEffort] = useState<string>(DEFAULT_MODEL.defaultReasoningEffort);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleModelChange = useCallback(
    (id: string, model: ModelDefinition) => {
      setModelId(id);
      setSelectedModel(model);
      // Reset reasoning effort to the new model's default
      setReasoningEffort(model.defaultReasoningEffort);
    },
    []
  );

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      repoOwner?: string;
      repoName?: string;
      model?: string;
      reasoningEffort?: string;
    }) => orpc.session.create.call(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['session', 'list'] });
      if (response.success) {
        // Route may not exist yet; use string navigation
        navigate({
          to: '/dashboard/session/$sessionId' as string,
          params: { sessionId: response.data.session.id } as Record<string, string>,
        });
      } else {
        setError(response.error);
      }
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create session');
    },
  });

  const handleSubmit = useCallback(() => {
    if (!prompt.trim()) return;

    setError(null);

    // Use the first line or first 60 chars as the session name
    const firstLine = prompt.trim().split('\n')[0] ?? '';
    const name =
      firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;

    createMutation.mutate({
      name,
      repoOwner: repoOwner.trim() || undefined,
      repoName: repoName.trim() || undefined,
      model: modelId,
      reasoningEffort,
    });
  }, [prompt, repoOwner, repoName, modelId, reasoningEffort, createMutation]);

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back{session?.user.name ? `, ${session.user.name}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Start a new agent session or continue a recent one.
        </p>
      </div>

      {/* Session creation form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          New Session
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Repository */}
          <RepoSelector
            repoOwner={repoOwner}
            repoName={repoName}
            onRepoOwnerChange={setRepoOwner}
            onRepoNameChange={setRepoName}
          />

          {/* Model + Reasoning Effort row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ModelSelector value={modelId} onChange={handleModelChange} />
            <ReasoningEffortPills
              selectedModel={selectedModel}
              value={reasoningEffort}
              onChange={setReasoningEffort}
            />
          </div>

          {/* Prompt */}
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleSubmit}
            disabled={createMutation.isPending}
          />

          {/* Submit */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending || !prompt.trim()}
              className="inline-flex items-center justify-center bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Starting Session...
                </>
              ) : (
                'Start Session'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <RecentSessions />
    </div>
  );
}
