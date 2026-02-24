import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../../orpc';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';

function SecretListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function RepoSecrets() {
  const queryClient = useQueryClient();
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [loadedRepo, setLoadedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: secretsResponse, isLoading } = useQuery({
    ...orpc.secret.listRepo.queryOptions({
      input: {
        repoOwner: loadedRepo?.owner ?? '',
        repoName: loadedRepo?.name ?? '',
      },
    }),
    enabled: !!loadedRepo,
  });

  const createMutation = useMutation({
    mutationFn: (data: { repoOwner: string; repoName: string; key: string; value: string }) =>
      orpc.secret.createRepo.call(data),
    onSuccess: (result) => {
      if (result.success) {
        setNewKey('');
        setNewValue('');
        setShowAddForm(false);
        queryClient.invalidateQueries({ queryKey: ['secret'] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.secret.deleteRepo.call({ id }),
    onSuccess: () => {
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['secret'] });
    },
  });

  const handleLoadSecrets = () => {
    if (repoOwner.trim() && repoName.trim()) {
      setLoadedRepo({ owner: repoOwner.trim(), name: repoName.trim() });
    }
  };

  const handleAddSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadedRepo || !newKey.trim() || !newValue.trim()) return;
    createMutation.mutate({
      repoOwner: loadedRepo.owner,
      repoName: loadedRepo.name,
      key: newKey.trim(),
      value: newValue.trim(),
    });
  };

  const secrets = secretsResponse?.success ? secretsResponse.data : [];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Repository Secrets</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage secrets scoped to a specific repository.
        </p>

        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="repoOwner" className="block text-sm font-medium text-gray-700">
              Owner
            </label>
            <input
              type="text"
              id="repoOwner"
              value={repoOwner}
              onChange={(e) => setRepoOwner(e.target.value)}
              placeholder="owner"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="repoName" className="block text-sm font-medium text-gray-700">
              Repository
            </label>
            <input
              type="text"
              id="repoName"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="repo-name"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleLoadSecrets}
            disabled={!repoOwner.trim() || !repoName.trim()}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Load Secrets
          </button>
        </div>

        {loadedRepo && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                Secrets for <span className="font-mono font-medium">{loadedRepo.owner}/{loadedRepo.name}</span>
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showAddForm ? 'Cancel' : '+ Add Secret'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddSecret} className="mb-4 p-4 bg-gray-50 rounded-md space-y-3">
                <div>
                  <label htmlFor="newRepoKey" className="block text-sm font-medium text-gray-700">
                    Key
                  </label>
                  <input
                    type="text"
                    id="newRepoKey"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="SECRET_KEY"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="newRepoValue" className="block text-sm font-medium text-gray-700">
                    Value
                  </label>
                  <input
                    type="password"
                    id="newRepoValue"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="secret value"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newKey.trim() || !newValue.trim()}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Secret'}
                </button>
              </form>
            )}

            {isLoading ? (
              <SecretListSkeleton />
            ) : secrets.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No secrets found for this repository.</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {secrets.map((secret) => (
                  <div key={secret.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-mono">{secret.key}</p>
                      <p className="text-sm text-gray-400">{'••••••••'}</p>
                    </div>
                    {deleteConfirm === secret.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Delete?</span>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(secret.id)}
                          disabled={deleteMutation.isPending}
                          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(secret.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalSecrets() {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: secretsResponse, isLoading } = useQuery(
    orpc.secret.listGlobal.queryOptions({ input: {} })
  );

  const createMutation = useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      orpc.secret.createGlobal.call(data),
    onSuccess: (result) => {
      if (result.success) {
        setNewKey('');
        setNewValue('');
        setShowAddForm(false);
        queryClient.invalidateQueries({ queryKey: ['secret'] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.secret.deleteGlobal.call({ id }),
    onSuccess: () => {
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['secret'] });
    },
  });

  const handleAddSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    createMutation.mutate({
      key: newKey.trim(),
      value: newValue.trim(),
    });
  };

  const secrets = secretsResponse?.success ? secretsResponse.data : [];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Global Secrets</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage secrets available across all repositories.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAddForm ? 'Cancel' : '+ Add Secret'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddSecret} className="mt-4 p-4 bg-gray-50 rounded-md space-y-3">
            <div>
              <label htmlFor="newGlobalKey" className="block text-sm font-medium text-gray-700">
                Key
              </label>
              <input
                type="text"
                id="newGlobalKey"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="SECRET_KEY"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="newGlobalValue" className="block text-sm font-medium text-gray-700">
                Value
              </label>
              <input
                type="password"
                id="newGlobalValue"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="secret value"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending || !newKey.trim() || !newValue.trim()}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Secret'}
            </button>
          </form>
        )}

        <div className="mt-4">
          {isLoading ? (
            <SecretListSkeleton />
          ) : secrets.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No global secrets configured.</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {secrets.map((secret) => (
                <div key={secret.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 font-mono">{secret.key}</p>
                    <p className="text-sm text-gray-400">{'••••••••'}</p>
                  </div>
                  {deleteConfirm === secret.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(secret.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(secret.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SecretSettings() {
  return (
    <div className="space-y-6">
      <RepoSecrets />
      <GlobalSecrets />
    </div>
  );
}
