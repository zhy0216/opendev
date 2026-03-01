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
