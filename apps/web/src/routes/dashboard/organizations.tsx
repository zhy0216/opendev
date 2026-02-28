import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../../orpc';
import { OrganizationListSkeleton } from '../../components/ui/Skeleton';
import { QueryError } from '../../components/ui/ErrorBoundary';
import { Modal } from '../../components/ui/Modal';

export const Route = createFileRoute('/dashboard/organizations')({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const { data: orgsResponse, isLoading, isError, error, refetch } = useQuery(
    orpc.organization.list.queryOptions()
  );

  const createMutation = useMutation({
    mutationFn: (data: { name: string }) =>
      orpc.organization.create.call(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'list'] });
      setShowCreateModal(false);
      setNewOrgName('');
    },
  });

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name: newOrgName });
  };

  const organizations = orgsResponse?.success ? orgsResponse.data : [];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Organizations</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your organizations and team members.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create organization
          </button>
        </div>
      </div>

      <div className="mt-8">
        {isError ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : isLoading ? (
          <OrganizationListSkeleton count={3} />
        ) : organizations.length === 0 ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first organization.</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Organization
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {organizations.map((org) => (
                <li key={org.id}>
                  <Link
                    to="/dashboard/organizations/$orgId"
                    params={{ orgId: org.id }}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 flex items-center sm:px-6">
                      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                        <div className="truncate">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-lg">
                                {org.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <p className="font-medium text-blue-600 truncate">{org.name}</p>
                              <p className="text-sm text-gray-500">/{org.slug}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create new organization"
        error={createMutation.error ? 'Failed to create organization. Please try again.' : null}
        onSubmit={handleCreateOrg}
        submitLabel="Create"
        submitPending={createMutation.isPending}
      >
        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">
            Organization name
          </label>
          <input
            type="text"
            name="org-name"
            id="org-name"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
            placeholder="My Organization"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            A URL-friendly slug will be automatically generated.
          </p>
        </div>
      </Modal>
    </div>
  );
}
