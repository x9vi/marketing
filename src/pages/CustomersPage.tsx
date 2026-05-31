import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import type { Customer } from '../api/types.js';
import { SectionCard } from '../components/SectionCard.js';
import { formatCurrency, formatDate } from '../lib/format.js';

const blankCustomer = { name: '', phone: '', email: '' };

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState(blankCustomer);

  const refresh = async (search = '') => {
    const result = await apiFetch<{ customers: Customer[] }>(`/customers${search ? `?query=${encodeURIComponent(search)}` : ''}`);
    setCustomers(result.customers);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiFetch('/customers', {
      method: 'POST',
      body: JSON.stringify(form)
    });
    setForm(blankCustomer);
    await refresh(query);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-400">Customers</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Profiles and purchase history</h1>
      </div>

      <SectionCard title="Search customers" subtitle="Lookup shoppers at POS or in admin">
        <div className="flex gap-3">
          <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, phone, or email" />
          <button onClick={() => void refresh(query)} className="rounded-2xl bg-gold-500 px-4 py-3 font-semibold text-slate-950">Search</button>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Add customer">
          <form onSubmit={submit} className="grid gap-3">
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
            <button className="rounded-2xl bg-gold-500 px-4 py-3 font-semibold text-slate-950">Create customer</button>
          </form>
        </SectionCard>

        <SectionCard title="Customer list" subtitle={`${customers.length} results`}>
          <div className="space-y-3">
            {customers.map((customer) => (
              <button key={customer.id} onClick={() => setSelected(customer)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{customer.name}</p>
                    <p className="text-sm text-slate-400">{customer.phone ?? customer.email ?? 'No contact'}</p>
                  </div>
                  <p className="text-sm text-gold-300">{customer.loyaltyPoints} points</p>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      {selected ? (
        <SectionCard title={selected.name} subtitle="Recent purchase history">
          <div className="space-y-3">
            {(selected.sales ?? []).map((sale: NonNullable<Customer['sales']>[number]) => (
              <div key={sale.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">Receipt {sale.receiptNumber}</p>
                    <p className="text-sm text-slate-400">{formatDate(sale.createdAt)}</p>
                  </div>
                  <p className="text-sm text-slate-200">{formatCurrency(sale.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
