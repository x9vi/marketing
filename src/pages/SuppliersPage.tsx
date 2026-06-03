import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../api/client.js';
import type { Supplier } from '../api/types.js';
import { PageHeader } from '../components/PageHeader.js';
import { SectionCard } from '../components/SectionCard.js';

const emptySupplier = { name: '', contact: '', email: '', phone: '', address: '' };

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptySupplier);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const result = await apiFetch<{ suppliers: Supplier[] }>('/suppliers');
    setSuppliers(result.suppliers);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/suppliers/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm(emptySupplier);
      setEditingId(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const edit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contact: supplier.contact ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? ''
    });
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this supplier?')) return;
    await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
    if (editingId === id) {
      setEditingId(null);
      setForm(emptySupplier);
    }
    await refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendors"
        title="Suppliers"
        description="Manage delivery partners, contacts, and purchase references for stock-in."
      />

      <SectionCard title={editingId ? 'Edit supplier' : 'Add supplier'} subtitle="Used when receiving inventory">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <input className="admin-input" required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Supplier name *" />
          <input className="admin-input" value={form.contact} onChange={(e) => setForm((c) => ({ ...c, contact: e.target.value }))} placeholder="Contact person" />
          <input className="admin-input" type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} placeholder="Email" />
          <input className="admin-input" value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} placeholder="Phone" />
          <input className="admin-input md:col-span-2" value={form.address} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} placeholder="Address" />
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
              {saving ? 'Saving…' : editingId ? 'Update supplier' : 'Add supplier'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptySupplier);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </SectionCard>

      <SectionCard title="All suppliers" subtitle={`${suppliers.length} vendor${suppliers.length === 1 ? '' : 's'}`}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="font-medium text-white">{supplier.name}</td>
                  <td>{supplier.contact ?? '—'}</td>
                  <td>{supplier.phone ?? '—'}</td>
                  <td>{supplier.email ?? '—'}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button type="button" className="admin-btn admin-btn--ghost text-xs" onClick={() => edit(supplier)}>
                        Edit
                      </button>
                      <button type="button" className="admin-btn admin-btn--ghost text-xs text-red-300" onClick={() => void remove(supplier.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {suppliers.length === 0 ? <p className="p-4 text-sm text-slate-400">No suppliers yet. Add your first vendor above.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
