import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../lib/auth';
import { orpc } from '../../orpc';
import { DEFAULT_MODEL, type ModelDefinition } from '@repo/types';
import { ProjectSelector } from '../../components/session/ProjectSelector';
import { ModelSelector } from '../../components/session/ModelSelector';
import { ReasoningEffortPills } from '../../components/session/ReasoningEffortPills';
import { PromptInput } from '../../components/session/PromptInput';
import { RecentSessions } from '../../components/session/RecentSessions';
import { cn } from '../../lib/utils';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndex,
});

function CreateProjectCard({ onCreated }: { onCreated: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; repoOwner: string; repoName: string }) =>
      orpc.project.create.call(data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['project', 'list'] });
        setName('');
        setRepoOwner('');
        setRepoName('');
        setError(null);
        onCreated();
      } else {
        setError(response.error);
      }
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create project');
    },
  });

  // Auto-fill name from repo when name is empty
  const derivedName = name.trim() || (repoOwner && repoName ? `${repoOwner}/${repoName}` : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const owner = repoOwner.trim();
    const repo = repoName.trim();
    if (!owner || !repo) return;
    setError(null);
    createMutation.mutate({
      name: derivedName,
      repoOwner: owner,
      repoName: repo,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Create your first project
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect a GitHub repository to get started with agent sessions.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="create-project-name" className="block text-sm font-medium text-gray-700">
            Project name
          </label>
          <input
            type="text"
            id="create-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={repoOwner && repoName ? `${repoOwner}/${repoName}` : 'My Project'}
            className={cn(
              'mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'placeholder:text-gray-400'
            )}
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave blank to use owner/repo as the name.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-repo-owner" className="block text-sm font-medium text-gray-700">
              Repository owner
            </label>
            <input
              type="text"
              id="create-repo-owner"
              value={repoOwner}
              onChange={(e) => setRepoOwner(e.target.value)}
              placeholder="octocat"
              required
              className={cn(
                'mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm',
                'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-gray-400'
              )}
            />
            <p className="mt-1 text-xs text-gray-500">GitHub user or org</p>
          </div>
          <div>
            <label htmlFor="create-repo-name" className="block text-sm font-medium text-gray-700">
              Repository name
            </label>
            <input
              type="text"
              id="create-repo-name"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="my-repo"
              required
              className={cn(
                'mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm',
                'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-gray-400'
              )}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending || !repoOwner.trim() || !repoName.trim()}
            className={cn(
              'inline-flex items-center justify-center bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium',
              'hover:bg-blue-700 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DashboardIndex() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [modelId, setModelId] = useState(DEFAULT_MODEL.id);
  const [selectedModel, setSelectedModel] = useState<ModelDefinition>(DEFAULT_MODEL);
  const [reasoningEffort, setReasoningEffort] = useState<string>(DEFAULT_MODEL.defaultReasoningEffort);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: projectsResponse, isLoading: projectsLoading } = useQuery(
    orpc.project.list.queryOptions()
  );

  const projects = projectsResponse?.success ? projectsResponse.data : [];
  const hasProjects = projects.length > 0;

  const handleModelChange = useCallback(
    (id: string, model: ModelDefinition) => {
      setModelId(id);
      setSelectedModel(model);
      setReasoningEffort(model.defaultReasoningEffort);
    },
    []
  );

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      projectId: string;
      model?: string;
      reasoningEffort?: string;
    }) => orpc.session.create.call(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['session', 'list'] });
      if (response.success) {
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
    if (!prompt.trim() || !projectId) return;

    setError(null);

    const firstLine = prompt.trim().split('\n')[0] ?? '';
    const name =
      firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;

    createMutation.mutate({
      name,
      projectId,
      model: modelId,
      reasoningEffort,
    });
  }, [prompt, projectId, modelId, reasoningEffort, createMutation]);

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back{session?.user.name ? `, ${session.user.name}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {hasProjects
            ? 'Start a new agent session or continue a recent one.'
            : 'Create a project to get started.'}
        </p>
      </div>

      {projectsLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-10 bg-gray-200 rounded mb-3" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      ) : !hasProjects ? (
        <CreateProjectCard
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['project', 'list'] });
          }}
        />
      ) : (
        <>
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
              {/* Project */}
              <ProjectSelector
                value={projectId}
                onChange={setProjectId}
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
                  disabled={createMutation.isPending || !prompt.trim() || !projectId}
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
        </>
      )}
    </div>
  );
}
