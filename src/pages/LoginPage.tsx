import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@store.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,199,110,0.15),_transparent_28%),linear-gradient(180deg,#07111f_0%,#0b1726_100%)] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <form onSubmit={submit} className="w-full rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-glow backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Welcome back</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Sign in</h2>
          <p className="mt-2 text-sm text-slate-400">Use one of the seeded demo accounts or your production credentials.</p>
          <label className="mt-8 block text-sm text-slate-300">
            Email
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-gold-400/50"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@store.com"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Password
            <input
              type="password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-gold-400/50"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password123!"
            />
          </label>
          {error ? <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-gold-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Enter store console'}
          </button>
        </form>
      </div>
    </div>
  );
}
