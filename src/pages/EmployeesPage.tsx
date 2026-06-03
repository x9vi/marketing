import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../api/client.js';
import type { AuthUser, Role } from '../api/types.js';
import { PageHeader } from '../components/PageHeader.js';
import { SectionCard } from '../components/SectionCard.js';

const emptyEmployee = { email: '', name: '', password: '', role: 'CASHIER' as Role };

function roleBadge(role: Role) {
  const styles: Record<Role, string> = {
    ADMIN: 'bg-gold-500/20 text-gold-300',
    CASHIER: 'bg-sky-500/20 text-sky-300',
    STOCK_MANAGER: 'bg-mint-500/20 text-mint-300'
  };
  return styles[role];
}

export function EmployeesPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [form, setForm] = useState(emptyEmployee);
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
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(form) });
      setForm(emptyEmployee);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (id: string, data: Partial<Pick<AuthUser, 'name' | 'role' | 'active'>>) => {
    await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Team & access control"
        description="Create staff accounts, assign roles, and deactivate users who leave the store."
      />

      <SectionCard title="Add team member" subtitle="New hires get a temporary password">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input className="admin-input" required type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} placeholder="Work email *" />
          <input className="admin-input" required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Full name *" />
          <input className="admin-input" required type="password" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} placeholder="Temporary password *" />
          <select className="admin-input" value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value as Role }))}>
            <option value="ADMIN">Admin</option>
            <option value="CASHIER">Cashier</option>
            <option value="STOCK_MANAGER">Stock manager</option>
          </select>
          <button type="submit" disabled={saving} className="admin-btn admin-btn--primary md:col-span-2 xl:col-span-4">
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Active directory" subtitle={`${users.length} accounts`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <div key={user.id} className={`rounded-2xl border p-4 ${user.active === false ? 'border-red-400/30 bg-red-950/20' : 'border-white/10 bg-black/20'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{user.name}</p>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${roleBadge(user.role)}`}>{user.role.replace('_', ' ')}</span>
              </div>

              <div className="mt-4 grid gap-2">
                <input
                  className="admin-input text-sm"
                  defaultValue={user.name}
                  onBlur={(e) => {
                    if (e.target.value !== user.name) void updateUser(user.id, { name: e.target.value });
                  }}
                />
                <select
                  className="admin-input text-sm"
                  value={user.role}
                  onChange={(e) => void updateUser(user.id, { role: e.target.value as Role })}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="STOCK_MANAGER">Stock manager</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={user.active !== false}
                    onChange={(e) => void updateUser(user.id, { active: e.target.checked })}
                  />
                  Account active
                </label>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
