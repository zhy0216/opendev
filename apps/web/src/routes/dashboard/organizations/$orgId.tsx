import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../../../orpc';
import { OrganizationDetailSkeleton, MemberListSkeleton } from '../../../components/ui/Skeleton';
import { QueryError } from '../../../components/ui/ErrorBoundary';
import { Modal } from '../../../components/ui/Modal';

export const Route = createFileRoute('/dashboard/organizations/$orgId')({
  component: OrganizationDetailPage,
});

function OrganizationDetailPage() {
  const { orgId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  const { data: orgResponse, isLoading: orgLoading, isError: orgError, error: orgQueryError, refetch: refetchOrg } = useQuery(
    orpc.organization.get.queryOptions({ input: { organizationId: orgId } })
  );

  const { data: membersResponse, isLoading: membersLoading, isError: membersError, error: membersQueryError, refetch: refetchMembers } = useQuery(
    orpc.organization.getMembers.queryOptions({ input: { organizationId: orgId } })
  );

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: 'admin' | 'member' }) =>
      orpc.organization.inviteMember.call({ organizationId: orgId, ...data }),
    onSuccess: () => {
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      orpc.organization.removeMember.call({ organizationId: orgId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'getMembers'] });
    },
  });

  const organization = orgResponse?.success ? orgResponse.data : null;
  const members = membersResponse?.success ? membersResponse.data : [];

  if (orgLoading) {
    return <OrganizationDetailSkeleton />;
  }

  if (orgError) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <QueryError error={orgQueryError} onRetry={() => refetchOrg()} />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">Organization not found</p>
          <Link to="/dashboard/organizations" className="mt-4 text-blue-600 hover:text-blue-500">
            Back to organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link to="/dashboard/organizations" className="text-sm text-blue-600 hover:text-blue-500">
          &larr; Back to organizations
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-2xl">
                {organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-semibold text-gray-900">{organization.name}</h1>
              <p className="text-sm text-gray-500">/{organization.slug}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Invite member
            </button>
          </div>

          {membersError ? (
            <QueryError error={membersQueryError} onRetry={() => refetchMembers()} compact />
          ) : membersLoading ? (
            <MemberListSkeleton count={3} />
          ) : members.length === 0 ? (
            <p className="text-gray-500 text-sm">No members yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {members.map((member) => (
                <li key={member.userId} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.userId}</p>
                    <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                  </div>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => removeMemberMutation.mutate(member.userId)}
                      disabled={removeMemberMutation.isPending}
                      className="text-sm text-red-600 hover:text-red-500 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite team member"
        error={inviteMutation.error ? 'Failed to send invite. Please try again.' : null}
        onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate({ email: inviteEmail, role: inviteRole }); }}
        submitLabel="Send invite"
        submitPending={inviteMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              id="invite-email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
              required
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
