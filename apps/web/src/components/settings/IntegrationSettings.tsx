import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../../orpc';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';

const INTEGRATION_TYPES = [
  {
    type: 'github',
    name: 'GitHub',
    description: 'Connect your GitHub repositories for automated code review and issue management.',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Receive notifications and interact with agents through Slack channels.',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" />
      </svg>
    ),
  },
  {
    type: 'linear',
    name: 'Linear',
    description: 'Sync issues and track project progress with Linear integration.',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.1 13.39a11.2 11.2 0 008.51 8.51l-8.51-8.51zm-.58-1.33a11.2 11.2 0 0110.92-10.5l-10.92 10.5zm1.91 2.66a11.2 11.2 0 007.45 7.45L3.43 14.72zm12.24-12.24a11.2 11.2 0 00-7.45-7.45l7.45 7.45zm1.33.58a11.2 11.2 0 01-10.92 10.5l10.92-10.5zm1.33.58a11.2 11.2 0 01-8.51 8.51l8.51-8.51z" />
      </svg>
    ),
  },
] as const;

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        enabled ? 'bg-blue-600' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function IntegrationCardSkeleton() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <div>
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function IntegrationSettings() {
  const queryClient = useQueryClient();

  const { data: settingsResponse, isLoading } = useQuery(
    orpc.integrationSetting.list.queryOptions({ input: {} })
  );

  const updateMutation = useMutation({
    mutationFn: (data: { type: string; config: unknown; enabled: boolean }) =>
      orpc.integrationSetting.update.call(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrationSetting'] });
    },
  });

  const settings = settingsResponse?.success ? settingsResponse.data : [];

  const getSettingForType = (type: string) => {
    return settings.find((s) => s.type === type);
  };

  const handleToggle = (type: string, enabled: boolean) => {
    const existing = getSettingForType(type);
    updateMutation.mutate({
      type,
      config: existing?.config ?? {},
      enabled,
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6">
        {[1, 2, 3].map((i) => (
          <IntegrationCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {INTEGRATION_TYPES.map((integration) => {
        const setting = getSettingForType(integration.type);
        const isEnabled = setting?.enabled ?? false;
        const hasConfig = setting?.config && Object.keys(setting.config as Record<string, unknown>).length > 0;

        return (
          <div key={integration.type} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="text-gray-700">{integration.icon}</div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">{integration.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{integration.description}</p>
                </div>
              </div>
              <Toggle
                enabled={isEnabled}
                onChange={(val) => handleToggle(integration.type, val)}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    isEnabled && hasConfig ? 'bg-green-500' : isEnabled ? 'bg-yellow-500' : 'bg-gray-300'
                  )}
                />
                <span className="text-sm text-gray-600">
                  {isEnabled && hasConfig
                    ? 'Connected'
                    : isEnabled
                      ? 'Enabled - Configuration required'
                      : 'Disconnected'}
                </span>
              </div>
              {isEnabled && (
                <span className="text-xs text-gray-400">
                  Configuration coming soon
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
