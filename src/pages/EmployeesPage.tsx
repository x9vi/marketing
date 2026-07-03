import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../api/client.js';
import type { AuthUser, Role } from '../api/types.js';
import { PageHeader } from '../components/PageHeader.js';
import { SectionCard } from '../components/SectionCard.js';

export function EmployeesPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const result = await apiFetch<{ users: AuthUser[] }>('/users');
    setUsers(result.users);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (id: string, data: Partial<Pick<AuthUser, 'username' | 'name' | 'active'>>) => {
    await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administrator"
        title="Single-store account"
        description="This installation uses one permanent administrator account stored in SQLite."
      />

      <SectionCard title="Administrator account" subtitle={`${users.length} account${users.length === 1 ? '' : 's'} stored locally`}>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="admin-input text-sm"
                  defaultValue={user.username}
                  onBlur={(e) => {
                    if (e.target.value !== user.username) void updateUser(user.id, { username: e.target.value });
                  }}
                  placeholder="Username"
                />
                <input
                  className="admin-input text-sm"
                  defaultValue={user.name}
                  onBlur={(e) => {
                    if (e.target.value !== user.name) void updateUser(user.id, { name: e.target.value });
                  }}
                  placeholder="Display name"
                />
              </div>
              <p className="mt-3 text-sm text-slate-400">Role: {user.role}</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={user.active !== false}
                  onChange={(e) => void updateUser(user.id, { active: e.target.checked })}
                />
                Account active
              </label>
            </div>
          ))}
          {users.length === 0 ? <p className="text-sm text-slate-400">No administrator account was found.</p> : null}
          <button type="button" disabled={saving} onClick={() => void submit(new Event('submit') as unknown as FormEvent)} className="admin-btn admin-btn--primary">
            Refresh account
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
