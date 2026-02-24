import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

const STORAGE_KEY = 'session:repo';

interface RepoSelectorProps {
  repoOwner: string;
  repoName: string;
  onRepoOwnerChange: (value: string) => void;
  onRepoNameChange: (value: string) => void;
}

interface StoredRepo {
  owner: string;
  name: string;
}

function loadStoredRepo(): StoredRepo | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredRepo;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveRepo(owner: string, name: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner, name }));
  } catch {
    // ignore
  }
}

export function RepoSelector({
  repoOwner,
  repoName,
  onRepoOwnerChange,
  onRepoNameChange,
}: RepoSelectorProps) {
  const [initialized, setInitialized] = useState(false);

  // Load persisted repo on mount
  useEffect(() => {
    if (!initialized) {
      const stored = loadStoredRepo();
      if (stored) {
        if (!repoOwner && stored.owner) onRepoOwnerChange(stored.owner);
        if (!repoName && stored.name) onRepoNameChange(stored.name);
      }
      setInitialized(true);
    }
  }, [initialized, repoOwner, repoName, onRepoOwnerChange, onRepoNameChange]);

  // Persist changes
  useEffect(() => {
    if (initialized && (repoOwner || repoName)) {
      saveRepo(repoOwner, repoName);
    }
  }, [initialized, repoOwner, repoName]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Repository
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            type="text"
            value={repoOwner}
            onChange={(e) => onRepoOwnerChange(e.target.value)}
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
            value={repoName}
            onChange={(e) => onRepoNameChange(e.target.value)}
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
    </div>
  );
}
