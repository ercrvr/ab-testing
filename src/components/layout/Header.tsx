import { Sun, Moon, LogOut, FlaskConical } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar bg-base-200/80 backdrop-blur-md shadow-sm px-4 sticky top-0 z-50 border-b border-base-300/50">
      <div className="flex-1 gap-2">
        <FlaskConical className="w-6 h-6 text-primary" />
        <a href="#/" className="text-lg font-heading font-bold tracking-tight">
          A/B Testing
        </a>
        <span className="badge badge-primary badge-xs font-mono text-[0.6rem] tracking-widest uppercase">
          Lab
        </span>
      </div>

      <div className="flex-none flex items-center gap-2">
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
  );
}
