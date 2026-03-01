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
  const [selectedRepo, setSelectedRepo] = useState<{
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: reposResponse, isLoading: reposLoading } = useQuery(
    orpc.repo.listUserRepos.queryOptions({ input: {} })
  );

  const repos = reposResponse?.success ? reposResponse.data : [];
  const repoError = reposResponse && !reposResponse.success ? reposResponse.error : null;

  const filtered = search
    ? repos.filter((r) =>
        r.fullName.toLowerCase().includes(search.toLowerCase())
      )
    : repos;

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      repoOwner: string;
      repoName: string;
      defaultBranch?: string;
    }) => orpc.project.create.call(data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['project', 'list'] });
        setName('');
        setSelectedRepo(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;
    setError(null);
    createMutation.mutate({
      name: name.trim() || selectedRepo.fullName,
      repoOwner: selectedRepo.owner,
      repoName: selectedRepo.name,
      defaultBranch: selectedRepo.defaultBranch,
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

      {(error || repoError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error || repoError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project name */}
        <div>
          <label htmlFor="create-project-name" className="block text-sm font-medium text-gray-700">
            Project name
          </label>
          <input
            type="text"
            id="create-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={selectedRepo?.fullName ?? 'My Project'}
            className={cn(
              'mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'placeholder:text-gray-400'
            )}
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional. Defaults to the repository name.
          </p>
        </div>

        {/* Repository selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Repository
          </label>

          {selectedRepo ? (
            <div className="flex items-center gap-3 border border-blue-200 bg-blue-50 rounded-lg px-3 py-2.5">
              <svg className="h-5 w-5 text-gray-600 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 flex-1">
                {selectedRepo.fullName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedRepo(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-200">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search repositories..."
                  className={cn(
                    'block w-full text-sm border-0 p-0',
                    'focus:ring-0 focus:outline-none',
                    'placeholder:text-gray-400'
                  )}
                />
              </div>

              {/* Repo list */}
              <div className="max-h-64 overflow-y-auto">
                {reposLoading ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-500">
                    Loading your repositories...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-500">
                    {search ? 'No repositories match your search.' : 'No repositories found.'}
                  </div>
                ) : (
                  <ul>
                    {filtered.map((repo) => (
                      <li key={repo.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRepo({
                              owner: repo.owner,
                              name: repo.name,
                              fullName: repo.fullName,
                              defaultBranch: repo.defaultBranch,
                            })
                          }
                          className={cn(
                            'w-full text-left px-3 py-2.5 flex items-center gap-3',
                            'hover:bg-gray-50 transition-colors',
                            'border-b border-gray-100 last:border-b-0'
                          )}
                        >
                          <svg className="h-4 w-4 text-gray-400 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                          </svg>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm text-gray-900">{repo.fullName}</span>
                          </div>
                          {repo.private && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Private
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending || !selectedRepo}
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
