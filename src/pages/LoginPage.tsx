import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { SupermarketBackground } from '../components/SupermarketBackground.js';

function StoreLogo() {
  return (
    <svg className="staff-login-card__logo-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="currentColor" fillOpacity="0.15" />
      <path
        d="M14 16h20l-1.8 11H15.2L12 10H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="32" r="2" fill="currentColor" />
      <circle cx="29" cy="32" r="2" fill="currentColor" />
      <path d="M18 10V8a2 2 0 012-2h8a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      if (remember) {
        localStorage.setItem('freshmart.rememberUsername', username);
      } else {
        localStorage.removeItem('freshmart.rememberUsername');
      }
      navigate('/app');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedUsername = localStorage.getItem('freshmart.rememberUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRemember(true);
    }
  }, []);

  return (
    <SupermarketBackground variant="login" className="flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="w-full max-w-[440px]">
        <article className="staff-login-card">
          <header className="staff-login-card__header">
            <div className="staff-login-card__brand">
              <StoreLogo />
              <div>
                <p className="staff-login-card__chain">FreshMart Supermarket</p>
                <h1 className="staff-login-card__title">Administrator Sign-In</h1>
              </div>
            </div>
            <div className="staff-login-card__meta">
              <span className="staff-login-card__badge">Production installation</span>
              <span className="staff-login-card__hours">SQLite-backed single-store POS</span>
            </div>
          </header>

          <div className="staff-login-card__body">
            <p className="staff-login-card__notice">
              <span className="staff-login-card__notice-dot" aria-hidden="true" />
              Back office, POS, inventory &amp; reports — authorized staff only
            </p>

            <form onSubmit={submit} className="staff-login-card__form">
              <div className="staff-login-card__field">
                <label htmlFor="staff-username">Username</label>
                <input
                  id="staff-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                  }}
                  placeholder="admin"
                  required
                />
              </div>

              <div className="staff-login-card__field">
                <label htmlFor="staff-password">Password</label>
                <input
                  id="staff-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
              </div>

              <div className="staff-login-card__row">
                <label className="staff-login-card__remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <button type="button" className="staff-login-card__link">
                  Forgot password?
                </button>
              </div>

              {error ? <div className="staff-login-card__error">{error}</div> : null}

              <button type="submit" disabled={loading} className="staff-login-card__submit">
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </form>
          </div>

          <footer className="staff-login-card__footer">
            <p>© {new Date().getFullYear()} FreshMart</p>
          </footer>
        </article>
      </div>
    </SupermarketBackground>
  );
}
