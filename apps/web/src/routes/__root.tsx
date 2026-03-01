import { createRootRoute, Outlet, Link, useMatches } from '@tanstack/react-router';
import { useSession, signOut } from '../lib/auth';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { data: session, isPending } = useSession();
  const matches = useMatches();
  const isDashboard = matches.some((m) => m.fullPath.startsWith('/dashboard'));

  if (isDashboard) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-gray-900">
              SaaS App
            </Link>
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 [&.active]:text-blue-600 font-medium"
              >
                Home
              </Link>
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 [&.active]:text-blue-600 font-medium"
              >
                Features
              </Link>
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 [&.active]:text-blue-600 font-medium"
              >
                Pricing
              </Link>
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 [&.active]:text-blue-600 font-medium"
              >
                Docs
              </Link>
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 [&.active]:text-blue-600 font-medium"
              >
                About
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <div className="flex items-center gap-3">
                  <Link to="/dashboard" className="flex items-center gap-2 group">
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                      {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {session.user.name || session.user.email?.split('@')[0]}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
