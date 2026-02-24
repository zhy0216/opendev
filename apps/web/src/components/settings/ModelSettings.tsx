import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MODEL_GROUPS } from '@repo/types';
import { orpc } from '../../orpc';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';

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

function ModelSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((group) => (
        <div key={group} className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-11 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModelSettings() {
  const queryClient = useQueryClient();

  const { data: preferencesResponse, isLoading } = useQuery(
    orpc.modelPreference.list.queryOptions({ input: {} })
  );

  const updateMutation = useMutation({
    mutationFn: (data: { modelId: string; enabled: boolean; isDefault: boolean }) =>
      orpc.modelPreference.update.call(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelPreference'] });
    },
  });

  const preferences = preferencesResponse?.success ? preferencesResponse.data : [];

  const getPreference = (modelId: string) => {
    return preferences.find((p) => p.modelId === modelId);
  };

  const isModelEnabled = (modelId: string): boolean => {
    const pref = getPreference(modelId);
    return pref ? pref.enabled : true;
  };

  const isModelDefault = (modelId: string): boolean => {
    const pref = getPreference(modelId);
    return pref ? pref.isDefault : false;
  };

  const handleToggle = (modelId: string, enabled: boolean) => {
    const isDefault = isModelDefault(modelId);
    updateMutation.mutate({
      modelId,
      enabled,
      isDefault: enabled ? isDefault : false,
    });
  };

  const handleSetDefault = (modelId: string) => {
    updateMutation.mutate({
      modelId,
      enabled: true,
      isDefault: true,
    });
  };

  if (isLoading) {
    return <ModelSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {MODEL_GROUPS.map((group) => (
        <div key={group.provider} className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {group.label}
            </h3>
            <div className="divide-y divide-gray-200">
              {group.models.map((model) => {
                const enabled = isModelEnabled(model.id);
                const isDefault = isModelDefault(model.id);
                const anyDefault = preferences.some((p) => p.isDefault);
                const showAsDefault = isDefault || (!anyDefault && model.isDefault);

                return (
                  <div
                    key={model.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900">{model.name}</h4>
                        {showAsDefault && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Default
                          </span>
                        )}
                      </div>
                      {model.description && (
                        <p className="mt-1 text-sm text-gray-500">{model.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Toggle
                        enabled={enabled}
                        onChange={(val) => handleToggle(model.id, val)}
                        disabled={updateMutation.isPending}
                      />
                      {enabled && !showAsDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(model.id)}
                          disabled={updateMutation.isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                        >
                          Set as default
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
