import { useState, useEffect } from 'react';
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

export function ProjectSelector({ value, onChange }: ProjectSelectorProps) {
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOwner, setNewOwner] = useState('');
  const [newName, setNewName] = useState('');
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
        // Only auto-select if the stored project still exists
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
    mutationFn: (data: { name: string; repoOwner: string; repoName: string }) =>
      orpc.project.create.call(data),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['project', 'list'] });
        onChange(response.data.id);
        setShowCreateForm(false);
        setNewOwner('');
        setNewName('');
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
    const owner = newOwner.trim();
    const name = newName.trim();
    if (!owner || !name) return;
    setCreateError(null);
    createMutation.mutate({
      name: `${owner}/${name}`,
      repoOwner: owner,
      repoName: name,
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
        <div className="mt-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="owner"
                className={cn(
                  'block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'placeholder:text-gray-400'
                )}
              />
              <p className="mt-1 text-xs text-gray-500">GitHub owner / org</p>
            </div>
            <div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="repository"
                className={cn(
                  'block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm',
                  'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'placeholder:text-gray-400'
                )}
              />
              <p className="mt-1 text-xs text-gray-500">Repository name</p>
            </div>
          </div>

          {createError && (
            <p className="mt-2 text-sm text-red-600">{createError}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !newOwner.trim() || !newName.trim()}
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
                setNewOwner('');
                setNewName('');
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
