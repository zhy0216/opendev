import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../../orpc';
import { cn } from '../../lib/utils';

const STORAGE_KEY = 'session:projectId';

interface ProjectSelectorProps {
  value: string | null;
  onChange: (projectId: string) => void;
}

function loadStoredProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveProjectId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

function InlineRepoSelector({
  onSelect,
}: {
  onSelect: (repo: {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
  }) => void;
}) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: reposResponse, isLoading } = useQuery(
    orpc.repo.listUserRepos.queryOptions({ input: {} })
  );

  const repos = reposResponse?.success ? reposResponse.data : [];
  const filtered = search
    ? repos.filter((r) =>
        r.fullName.toLowerCase().includes(search.toLowerCase())
      )
    : repos;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories..."
          className="block w-full text-sm border-0 p-0 focus:ring-0 focus:outline-none placeholder:text-gray-400"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">
            Loading repositories...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">
            {search ? 'No matches.' : 'No repositories found.'}
          </div>
        ) : (
          <ul>
            {filtered.map((repo) => (
              <li key={repo.id}>
                <button
                  type="button"
                  onClick={() =>
                    onSelect({
                      owner: repo.owner,
                      name: repo.name,
                      fullName: repo.fullName,
                      defaultBranch: repo.defaultBranch,
                    })
                  }
                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
                >
                  <span className="text-gray-900 truncate">{repo.fullName}</span>
                  {repo.private && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
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
  );
}

export function ProjectSelector({ value, onChange }: ProjectSelectorProps) {
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<{
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
  } | null>(null);
  const [projectName, setProjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    data: projectsResponse,
    isLoading,
  } = useQuery(orpc.project.list.queryOptions());

  const projects = projectsResponse?.success ? projectsResponse.data : [];

  // Load persisted projectId on mount
  useEffect(() => {
    if (!initialized && !isLoading) {
      const storedId = loadStoredProjectId();
      if (storedId && !value) {
        const exists = projects.some((p) => p.id === storedId);
        if (exists) {
          onChange(storedId);
        }
      }
      setInitialized(true);
    }
  }, [initialized, isLoading, projects, value, onChange]);

  // Persist changes
  useEffect(() => {
    if (initialized && value) {
      saveProjectId(value);
    }
  }, [initialized, value]);

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
        onChange(response.data.id);
        setShowCreateForm(false);
        setSelectedRepo(null);
        setProjectName('');
        setCreateError(null);
      } else {
        setCreateError(response.error);
      }
    },
    onError: (err: Error) => {
      setCreateError(err.message || 'Failed to create project');
    },
  });

  const handleCreate = () => {
    if (!selectedRepo) return;
    setCreateError(null);
    createMutation.mutate({
      name: projectName.trim() || selectedRepo.fullName,
      repoOwner: selectedRepo.owner,
      repoName: selectedRepo.name,
      defaultBranch: selectedRepo.defaultBranch,
    });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Project
      </label>

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <select
            value={value ?? ''}
            onChange={(e) => {
              if (e.target.value) {
                onChange(e.target.value);
              }
            }}
            className={cn(
              'block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              !value && 'text-gray-400'
            )}
          >
            <option value="" disabled>
              {isLoading ? 'Loading projects...' : 'Select a project'}
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.repoOwner}/{p.repoName}
              </option>
            ))}
          </select>
        </div>

        {!showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className={cn(
              'inline-flex items-center border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium',
              'text-gray-700 bg-white hover:bg-gray-50 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          >
            + New
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="mt-3 border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          {/* Project name */}
          <div>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={selectedRepo?.fullName ?? 'Project name (optional)'}
              className={cn(
                'block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm',
                'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'placeholder:text-gray-400'
              )}
            />
          </div>

          {/* Repo selection */}
          {selectedRepo ? (
            <div className="flex items-center gap-2 border border-blue-200 bg-blue-50 rounded-lg px-3 py-2">
              <svg className="h-4 w-4 text-gray-600 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
              <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                {selectedRepo.fullName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedRepo(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Change
              </button>
            </div>
          ) : (
            <InlineRepoSelector onSelect={setSelectedRepo} />
          )}

          {createError && (
            <p className="text-sm text-red-600">{createError}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !selectedRepo}
              className={cn(
                'inline-flex items-center bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium',
                'hover:bg-blue-700 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setSelectedRepo(null);
                setProjectName('');
                setCreateError(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
