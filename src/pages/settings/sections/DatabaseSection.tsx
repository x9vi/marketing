import { useState, useEffect } from 'react';
import { SectionCard } from '../components/SectionCard.js';
import { apiFetch } from '../../../api/client.js';
import type { DatabaseInfo } from '../types.js';

export function DatabaseSection() {
  const [info, setInfo] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DatabaseInfo>('/settings/db-info');
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch database info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInfo();
  }, []);

  const performAction = async (endpoint: string, successMessage: string) => {
    setActionStatus(null);
    try {
      await apiFetch(endpoint, { method: 'POST' });
      setActionStatus({ type: 'success', message: successMessage });
      await fetchInfo();
    } catch (err) {
      setActionStatus({ type: 'error', message: err instanceof Error ? err.message : 'Action failed' });
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading database information...</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!info) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">All data is securely stored in a local SQLite database accessed through Prisma ORM.</p>
          </div>
        </div>
      </div>

      <SectionCard title="Database Details" description="Read-only information about your active database.">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Type</p>
            <p className="mt-1 font-medium text-slate-900">{info.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">File Location</p>
            <p className="mt-1 font-mono text-xs text-slate-700">{info.location}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">File Size</p>
            <p className="mt-1 font-medium text-slate-900">{(info.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>

        <div className="mt-8">
          <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-500">Record Counts</h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-2xl font-semibold text-blue-600">{info.products.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Products</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-2xl font-semibold text-blue-600">{info.sales.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Sales</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-2xl font-semibold text-blue-600">{info.customers.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Customers</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-2xl font-semibold text-blue-600">{info.suppliers.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Suppliers</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-2xl font-semibold text-blue-600">{info.transactions.toLocaleString()}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Transactions</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Maintenance" description="Tools to keep your database running smoothly.">
        {actionStatus && (
          <div className={`mb-6 rounded-lg p-4 text-sm font-medium ${actionStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {actionStatus.message}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Optimize Database</h4>
            <p className="mb-6 text-xs text-slate-500">Run Prisma PRAGMA optimizations and flush the Write-Ahead Log (WAL).</p>
            <button
              type="button"
              onClick={() => void performAction('/settings/db-optimize', 'Database optimized successfully.')}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Run Optimization
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Vacuum Database</h4>
            <p className="mb-6 text-xs text-slate-500">Rebuild the database file, repacking it into a minimal amount of disk space.</p>
            <button
              type="button"
              onClick={() => void performAction('/settings/db-vacuum', 'Database vacuumed successfully.')}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Run Vacuum
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
