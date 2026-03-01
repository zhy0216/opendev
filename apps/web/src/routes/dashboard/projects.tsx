import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../../orpc';
import { ProjectListSkeleton } from '../../components/ui/Skeleton';
import { QueryError } from '../../components/ui/ErrorBoundary';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';

export const Route = createFileRoute('/dashboard/projects')({
  component: ProjectsPage,
});

function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<{
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
  } | null>(null);
  const [repoSearch, setRepoSearch] = useState('');

  const { data: projectsResponse, isLoading, isError, error, refetch } = useQuery(
    orpc.project.list.queryOptions()
  );

  const { data: reposResponse, isLoading: reposLoading } = useQuery({
    ...orpc.repo.listUserRepos.queryOptions({ input: {} }),
    enabled: showCreateModal,
  });

  const repos = reposResponse?.success ? reposResponse.data : [];
  const filteredRepos = repoSearch
    ? repos.filter((r) => r.fullName.toLowerCase().includes(repoSearch.toLowerCase()))
    : repos;

  const createMutation = useMutation({
    mutationFn: (data: { name: string; repoOwner: string; repoName: string; defaultBranch?: string }) =>
      orpc.project.create.call(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', 'list'] });
      setShowCreateModal(false);
      setNewProjectName('');
      setSelectedRepo(null);
      setRepoSearch('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) =>
      orpc.project.delete.call({ projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', 'list'] });
    },
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;
    createMutation.mutate({
      name: newProjectName.trim() || selectedRepo.fullName,
      repoOwner: selectedRepo.owner,
      repoName: selectedRepo.name,
      defaultBranch: selectedRepo.defaultBranch,
    });
  };

  const projects = projectsResponse?.success ? projectsResponse.data : [];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all your projects and their status.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create project
          </button>
        </div>
      </div>

      <div className="mt-8">
        {isError ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : isLoading ? (
          <ProjectListSkeleton count={5} />
        ) : projects.length === 0 ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2V7" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Project
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {projects.map((project) => (
                <li key={project.id}>
                  <div className="px-4 py-4 flex items-center sm:px-6">
                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="truncate">
                        <div className="flex text-sm">
                          <p className="font-medium text-blue-600 truncate">{project.name}</p>
                        </div>
                        <div className="mt-2 flex">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <a href={`https://github.com/${project.repoOwner}/${project.repoName}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {project.repoOwner}/{project.repoName}
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => deleteMutation.mutate(project.id)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedRepo(null);
          setRepoSearch('');
          setNewProjectName('');
        }}
        title="Create new project"
        error={createMutation.error ? 'Failed to create project. Please try again.' : null}
        onSubmit={handleCreateProject}
        submitLabel="Create"
        submitDisabled={!selectedRepo}
        submitPending={createMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
              Project name
            </label>
            <input
              type="text"
              name="project-name"
              id="project-name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
              placeholder={selectedRepo?.fullName ?? 'My Project'}
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional. Defaults to the repository name.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GitHub Repository
            </label>
            {selectedRepo ? (
              <div className="flex items-center gap-2 border border-blue-200 bg-blue-50 rounded-md px-3 py-2">
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
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200">
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repositories..."
                    className="block w-full text-sm border-0 p-0 focus:ring-0 focus:outline-none placeholder:text-gray-400"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {reposLoading ? (
                    <div className="px-3 py-6 text-center text-sm text-gray-500">
                      Loading repositories...
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-gray-500">
                      {repoSearch ? 'No matches.' : 'No repositories found.'}
                    </div>
                  ) : (
                    <ul>
                      {filteredRepos.map((repo) => (
                        <li key={repo.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedRepo({
                              owner: repo.owner,
                              name: repo.name,
                              fullName: repo.fullName,
                              defaultBranch: repo.defaultBranch,
                            })}
                            className={cn(
                              'w-full text-left px-3 py-2 flex items-center gap-2',
                              'hover:bg-gray-50 text-sm',
                              'border-b border-gray-100 last:border-b-0'
                            )}
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
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
