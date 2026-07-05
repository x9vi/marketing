import { useState, useEffect } from 'react';
import { SectionCard } from '../components/SectionCard.js';
import { Field } from '../components/Field.js';
import { apiFetch } from '../../../api/client.js';
import { useAuth } from '../../../context/AuthContext.js';

export function AdministratorSection() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState({ username: '', name: '', password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setProfile((p) => ({ ...p, username: user.username, name: user.name }));
    }
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    if (profile.password && profile.password !== profile.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    try {
      await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: profile.username,
          name: profile.name,
          password: profile.password || undefined,
        }),
      });
      await refresh();
      setProfile((current) => ({ ...current, password: '', confirmPassword: '' }));
      setMessage('Administrator account updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">This POS system is designed for a single-store installation. There is only one permanent Administrator account. Role management and demo users have been removed.</p>
          </div>
        </div>
      </div>

      <SectionCard title="Administrator Account" description="Update your login credentials and display name.">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Username" value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} />
          <Field label="Display Name" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
          
          <div className="col-span-2 border-t border-slate-100 pt-6">
            <h4 className="mb-4 text-sm font-medium text-slate-900">Change Password</h4>
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="New Password" type="password" placeholder="Leave blank to keep current" value={profile.password} onChange={(e) => setProfile((p) => ({ ...p, password: e.target.value }))} />
              <Field label="Confirm Password" type="password" value={profile.confirmPassword} onChange={(e) => setProfile((p) => ({ ...p, confirmPassword: e.target.value }))} />
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <div className="flex-1">
            {message && <p className="text-sm font-medium text-emerald-600">{message}</p>}
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          </div>
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update Account'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
