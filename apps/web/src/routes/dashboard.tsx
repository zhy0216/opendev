import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router';
import { useSession, signOut } from '../lib/auth';
import { ErrorBoundary, PageErrorFallback } from '../components/ui/ErrorBoundary';
import { DashboardLayoutSkeleton } from '../components/ui/Skeleton';

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  if (isPending) {
    return <DashboardLayoutSkeleton />;
  }

  if (!session) {
    navigate({ to: '/auth/login' });
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/' });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col bg-white border-r border-gray-200">
        <div className="flex h-14 items-center px-5 border-b border-gray-200">
          <Link to="/dashboard" className="text-lg font-bold text-gray-900">
            Dashboard
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <Link
            to="/dashboard"
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 [&.active]:bg-gray-100 [&.active]:text-gray-900"
          >
            Overview
          </Link>
          <Link
            to="/dashboard/sessions"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 [&.active]:bg-gray-100 [&.active]:text-gray-900"
          >
            Sessions
          </Link>
          <Link
            to="/dashboard/projects"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 [&.active]:bg-gray-100 [&.active]:text-gray-900"
          >
            Projects
          </Link>
          <Link
            to="/dashboard/organizations"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 [&.active]:bg-gray-100 [&.active]:text-gray-900"
          >
            Organizations
          </Link>
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 [&.active]:bg-gray-100 [&.active]:text-gray-900"
          >
            Settings
          </Link>
        </nav>

        <div className="border-t border-gray-200 px-4 py-3">
          <p className="truncate text-sm text-gray-600">{session.user.email}</p>
          <button
            onClick={handleSignOut}
            className="mt-1 text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 p-6">
        <ErrorBoundary
          fallback={
            <PageErrorFallback
              title="Page Error"
              description="Something went wrong while loading this page. Please try again."
              onRetry={() => window.location.reload()}
            />
          }
        >
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
