import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../lib/auth';
import { orpc } from '../../orpc';
import { SettingsSkeleton } from '../../components/ui/Skeleton';
import { QueryError } from '../../components/ui/ErrorBoundary';
import { ModelSettings } from '../../components/settings/ModelSettings';
import { SecretSettings } from '../../components/settings/SecretSettings';
import { IntegrationSettings } from '../../components/settings/IntegrationSettings';
import { cn } from '../../lib/utils';

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
});

type SettingsTab = 'profile' | 'models' | 'secrets' | 'integrations';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'models', label: 'Models' },
  { id: 'secrets', label: 'Secrets' },
  { id: 'integrations', label: 'Integrations' },
];

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="flex gap-8">
        <nav className="w-48 flex-shrink-0 border-r border-gray-200 pr-4">
          <ul className="space-y-1">
            {TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'models' && <ModelSettings />}
          {activeTab === 'secrets' && <SecretSettings />}
          {activeTab === 'integrations' && <IntegrationSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const { data: profileResponse, isLoading, isError, error, refetch } = useQuery(
    orpc.user.getProfile.queryOptions()
  );

  const updateMutation = useMutation({
    mutationFn: (data: { name: string }) => orpc.user.updateProfile.call(data),
    onSuccess: (result) => {
      if (result.success) {
        setMessage('Profile updated successfully!');
        queryClient.invalidateQueries({ queryKey: ['user', 'getProfile'] });
      } else {
        setMessage(result.error || 'Failed to update profile');
      }
    },
    onError: () => {
      setMessage('Failed to update profile. Please try again.');
    },
  });

  useEffect(() => {
    if (profileResponse?.success && profileResponse.data.name) {
      setName(profileResponse.data.name);
    }
  }, [profileResponse]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    updateMutation.mutate({ name });
  };

  const profile = profileResponse?.success ? profileResponse.data : null;

  if (isError) {
    return <QueryError error={error} onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Information</h3>
          <p className="mt-1 text-sm text-gray-500">
            Update your account profile information.
          </p>

          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={session?.user.email || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Your name"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Account</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Account ID</h4>
                <p className="text-sm text-gray-500 font-mono">{profile?.id || session?.user.id}</p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Verified</h4>
                <p className="text-sm text-gray-500">
                  {profile?.emailVerified ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Not verified
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <h4 className="text-sm font-medium text-red-600">Delete Account</h4>
                <p className="text-sm text-gray-500">
                  Permanently delete your account and all data.
                </p>
              </div>
              <button className="text-sm text-red-600 hover:text-red-500 font-medium">
                Delete account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
