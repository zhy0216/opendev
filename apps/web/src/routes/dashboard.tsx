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
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-xl font-bold text-gray-900">
                  Dashboard
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/dashboard"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium [&.active]:border-blue-500 [&.active]:text-gray-900"
                >
                  Overview
                </Link>
                <Link
                  to="/dashboard/projects"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium [&.active]:border-blue-500 [&.active]:text-gray-900"
                >
                  Projects
                </Link>
                <Link
                  to="/dashboard/organizations"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium [&.active]:border-blue-500 [&.active]:text-gray-900"
                >
                  Organizations
                </Link>
                <Link
                  to="/dashboard/settings"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium [&.active]:border-blue-500 [&.active]:text-gray-900"
                >
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
