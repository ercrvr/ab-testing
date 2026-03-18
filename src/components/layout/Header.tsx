import { Sun, Moon, LogOut, FlaskConical, Gauge } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { useRateLimit } from '../../hooks/useRateLimit';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { auth, logout } = useAuth();
  const rateLimit = useRateLimit();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Rate limit color coding
  const rateLimitColor =
    rateLimit.remaining < 100
      ? 'text-error'
      : rateLimit.remaining < 500
        ? 'text-warning'
        : 'text-base-content/50';

  return (
    <div className="sticky top-0 z-50">
      {/* Main navbar */}
      <header className="navbar bg-base-200/80 backdrop-blur-md shadow-sm px-4 border-b border-base-300/50 min-h-0 py-2">
        <div className="flex-1 gap-3">
          <a href="#/" className="flex items-center gap-2 shrink-0">
            <FlaskConical className="w-6 h-6 text-primary" />
            <span className="text-lg font-heading font-bold tracking-tight hidden md:inline">
              A/B Testing
            </span>
            <span className="badge badge-primary badge-xs font-mono text-[0.6rem] tracking-widest uppercase hidden md:inline-flex">
              Lab
            </span>
          </a>
        </div>

        <div className="flex-none flex items-center gap-2">
          {/* Rate limit indicator */}
          {auth.isAuthenticated && rateLimit.lastChecked > 0 && (
            <div
              className={`flex items-center gap-1 text-xs font-mono ${rateLimitColor}`}
              title={`API calls: ${rateLimit.remaining.toLocaleString()} / ${rateLimit.limit.toLocaleString()} remaining`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {rateLimit.remaining.toLocaleString()}
              </span>
              <span className="sm:hidden">
                {rateLimit.remaining > 999
                  ? `${(rateLimit.remaining / 1000).toFixed(1)}k`
                  : rateLimit.remaining}
              </span>
            </div>
          )}

          {/* Theme toggle */}
          <button
            className="btn btn-ghost btn-circle btn-sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* User menu */}
          {auth.isAuthenticated && auth.user && (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-8 rounded-full">
                  <img src={auth.user.avatarUrl} alt={auth.user.login} />
                </div>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
              >
                <li className="menu-title">{auth.user.login}</li>
                <li>
                  <button onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Breadcrumb navigation — separate bar, always visible on mobile */}
      {auth.isAuthenticated && <Breadcrumbs />}
    </div>
  );
}
