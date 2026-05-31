import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import type { AuthUser, Role } from '../api/types.js';
import { SectionCard } from '../components/SectionCard.js';

const emptyEmployee = { email: '', name: '', password: '', role: 'CASHIER' as Role };

export function EmployeesPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [form, setForm] = useState(emptyEmployee);

  const refresh = async () => {
    const result = await apiFetch<{ users: AuthUser[] }>('/users');
    setUsers(result.users);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(form)
    });
    setForm(emptyEmployee);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-400">Employees</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Role-based access control</h1>
      </div>

      <SectionCard title="Add employee">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" />
          <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Temporary password" />
          <select className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))}>
            <option value="ADMIN">Admin</option>
            <option value="CASHIER">Cashier</option>
            <option value="STOCK_MANAGER">Stock Manager</option>
          </select>
          <button className="rounded-2xl bg-gold-500 px-4 py-3 font-semibold text-slate-950 md:col-span-2 xl:col-span-4">Create employee</button>
        </form>
      </SectionCard>

      <SectionCard title="Employees" subtitle="Current login accounts">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-medium text-white">{user.name}</p>
              <p className="text-sm text-slate-400">{user.email}</p>
              <p className="mt-2 text-sm text-gold-300">{user.role}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
