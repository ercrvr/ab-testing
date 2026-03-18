import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Github, KeyRound, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const OAUTH_PROXY_URL = import.meta.env.VITE_OAUTH_PROXY_URL;

// Remove trailing slash and hash
const APP_URL = window.location.origin + window.location.pathname.replace(/\/$/, '');

export function Landing() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();

  const [pat, setPat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPatInput, setShowPatInput] = useState(!GITHUB_CLIENT_ID);

  // Redirect if authenticated
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/repos', { replace: true });
    }
  }, [auth.isAuthenticated, navigate]);

  // OAuth callback handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code) {
      // Immediately clean URL
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);

      const savedState = sessionStorage.getItem('ab-dashboard-oauth-state');
      if (state !== savedState) {
        setError('OAuth state mismatch. Please try again.');
      } else {
        sessionStorage.removeItem('ab-dashboard-oauth-state');
        exchangeCodeForToken(code);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exchangeCodeForToken(code: string) {
    setOauthLoading(true);
    setError(null);
    try {
      const response = await fetch(OAUTH_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (data.access_token) {
        await login(data.access_token, 'oauth');
        navigate('/repos', { replace: true });
      } else {
        setError(data.error_description || 'Failed to authenticate with GitHub.');
      }
    } catch {
      setError('Failed to connect to authentication server. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  }

  function handleOAuthLogin() {
    const state = crypto.randomUUID();
    sessionStorage.setItem('ab-dashboard-oauth-state', state);
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(APP_URL)}&scope=repo&state=${state}`;
  }

  async function handlePatLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pat.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await login(pat.trim(), 'pat');
      navigate('/repos', { replace: true });
    } catch {
      setError('Invalid token. Please check that your token is correct and has the required scopes.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="hero min-h-[80vh]">
      <div className="hero-content text-center">
        <div className="max-w-lg w-full">

          {/* Logo & Title */}
          <FlaskConical className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-heading font-bold tracking-tight">
            A/B Testing Dashboard
          </h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="lab-label text-primary flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Experiment Viewer
            </span>
          </div>
          <p className="py-6 text-base-content/70">
            Connect your GitHub account to visualize and compare A/B test results
            across your repositories.
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <span className="badge badge-outline badge-sm font-mono tracking-wider">GitHub Native</span>
            <span className="badge badge-outline badge-sm font-mono tracking-wider">Side-by-Side Grid</span>
            <span className="badge badge-outline badge-sm font-mono tracking-wider">Smart Rendering</span>
          </div>

          {/* OAuth Loading State (shown during code exchange) */}
          {oauthLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-base-content/70">Authenticating with GitHub...</p>
            </div>
          )}

          {/* Auth UI (hidden during OAuth exchange) */}
          {!oauthLoading && (
            <div className="space-y-4">

              {/* Error banner */}
              {error && (
                <div className="alert alert-error text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* OAuth button - only show if CLIENT_ID is configured */}
              {GITHUB_CLIENT_ID && (
                <button
                  className="btn btn-primary w-full max-w-sm mx-auto flex"
                  onClick={handleOAuthLogin}
                >
                  <Github className="w-5 h-5" />
                  Login with GitHub
                </button>
              )}

              {/* Divider */}
              {GITHUB_CLIENT_ID && (
                <div className="divider text-base-content/40 text-xs max-w-sm mx-auto">or</div>
              )}

              {/* PAT Section */}
              {!showPatInput ? (
                <button
                  className="btn btn-ghost btn-sm text-base-content/60"
                  onClick={() => setShowPatInput(true)}
                >
                  <KeyRound className="w-4 h-4" />
                  Use Personal Access Token
                </button>
              ) : (
                <form onSubmit={handlePatLogin} className="space-y-3 max-w-sm mx-auto">
                  <input
                    type="password"
                    className="input input-bordered w-full font-mono text-sm"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={pat}
                    onChange={(e) => setPat(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary w-full"
                    disabled={isLoading || !pat.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </button>
                  <p className="text-xs text-base-content/50">
                    Token needs <code className="font-mono bg-base-300 px-1 rounded">repo</code> scope
                    for private repositories.{' '}
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=AB+Testing+Dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary inline-flex items-center gap-0.5"
                    >
                      Create a PAT <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </form>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
