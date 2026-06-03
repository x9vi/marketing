import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { SupermarketBackground } from '../components/SupermarketBackground.js';

const DEMO_ACCOUNTS = {
  admin: { email: 'admin@store.com', password: 'Password123!', label: 'Store admin' },
  cashier: { email: 'cashier@store.com', password: 'Password123!', label: 'Checkout' },
  inventory: { email: 'stock@store.com', password: 'Password123!', label: 'Stock room' },
  manager: { email: 'admin@store.com', password: 'Password123!', label: 'Floor manager' }
} as const;

type DemoRole = keyof typeof DEMO_ACCOUNTS;

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<DemoRole | null>(null);

  const fillDemo = (role: DemoRole) => {
    const account = DEMO_ACCOUNTS[role];
    setEmail(account.email);
    setPassword(account.password);
    setActiveRole(role);
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/app');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const roleButtons: Array<{ id: DemoRole; label: string; hint: string }> = [
    { id: 'cashier', label: 'Cashier', hint: 'POS' },
    { id: 'inventory', label: 'Stock', hint: 'Inventory' },
    { id: 'manager', label: 'Manager', hint: 'Reports' },
    { id: 'admin', label: 'Admin', hint: 'Full access' }
  ];

  return (
    <SupermarketBackground variant="login" className="flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="w-full max-w-[440px]">
        <article className="staff-login-card">
          <header className="staff-login-card__header">
            <div className="staff-login-card__brand">
              <StoreLogo />
              <div>
                <p className="staff-login-card__chain">FreshMart Supermarket</p>
                <h1 className="staff-login-card__title">Team Member Sign-In</h1>
              </div>
            </div>
            <div className="staff-login-card__meta">
              <span className="staff-login-card__badge">Store #1042</span>
              <span className="staff-login-card__hours">Open today · 7:00 AM – 10:00 PM</span>
            </div>
          </header>

          <div className="staff-login-card__body">
            <p className="staff-login-card__notice">
              <span className="staff-login-card__notice-dot" aria-hidden="true" />
              Back office, POS, inventory &amp; reports — authorized staff only
            </p>

            <form onSubmit={submit} className="staff-login-card__form">
              <div className="staff-login-card__field">
                <label htmlFor="staff-email">Work email</label>
                <input
                  id="staff-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setActiveRole(null);
                  }}
                  placeholder="name@freshmart.store"
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setActiveRole(null);
                  }}
                  placeholder="Enter your staff password"
                  required
                />
              </div>

              <div className="staff-login-card__row">
                <label className="staff-login-card__remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Keep me signed in on this device</span>
                </label>
                <button type="button" className="staff-login-card__link">
                  Forgot password?
                </button>
              </div>

              {error ? <div className="staff-login-card__error">{error}</div> : null}

              <button type="submit" disabled={loading} className="staff-login-card__submit">
                {loading ? 'Opening store system…' : 'Enter store system'}
              </button>
            </form>

            <div className="staff-login-card__divider">
              <span>Demo quick access</span>
            </div>

            <div className="staff-login-card__roles">
              {roleButtons.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => fillDemo(role.id)}
                  className={`staff-login-card__role ${activeRole === role.id ? 'staff-login-card__role--active' : ''}`}
                >
                  <span className="staff-login-card__role-label">{role.label}</span>
                  <span className="staff-login-card__role-hint">{role.hint}</span>
                </button>
              ))}
            </div>

            {activeRole ? (
              <p className="staff-login-card__demo-hint">
                Demo filled: <strong>{DEMO_ACCOUNTS[activeRole].email}</strong> — tap Enter store system
              </p>
            ) : null}
          </div>

          <footer className="staff-login-card__footer">
            <p>© {new Date().getFullYear()} FreshMart · Internal use only</p>
          </footer>
        </article>
      </div>
    </SupermarketBackground>
  );
}
