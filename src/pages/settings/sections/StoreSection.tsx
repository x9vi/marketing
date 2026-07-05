import { useState, useRef } from 'react';
import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Field } from '../components/Field.js';
import { Select } from '../components/Select.js';
import { apiFetch } from '../../../api/client.js';

export function StoreSection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const store = settings.store;
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await apiFetch<{ logoUrl: string }>('/settings/logo', {
        method: 'POST',
        body: formData,
      });
      update('store', { ...store, logoUrl: res.logoUrl });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Store Logo" description="Upload a high-resolution logo for your store.">
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt="Store logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm text-slate-400">No logo</span>
            )}
          </div>
          <div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => void handleUpload(e)} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {uploading ? 'Uploading...' : 'Choose File'}
            </button>
            <p className="mt-2 text-xs text-slate-500">Recommended: Square PNG or JPG, max 5MB.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Store Information" description="Basic details about your business used on receipts and reports.">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Store Name" value={store.name} onChange={(e) => update('store', { ...store, name: e.target.value })} />
          <Field label="Tax Number" value={store.taxNumber} onChange={(e) => update('store', { ...store, taxNumber: e.target.value })} />
          <Field label="Phone Number" value={store.phone} onChange={(e) => update('store', { ...store, phone: e.target.value })} />
          <Field label="Email Address" type="email" value={store.email} onChange={(e) => update('store', { ...store, email: e.target.value })} />
          <Field label="Physical Address" className="md:col-span-2" value={store.address} onChange={(e) => update('store', { ...store, address: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Localization" description="Regional settings for your store.">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Currency Code (e.g. USD, EUR)" value={store.currency} onChange={(e) => update('store', { ...store, currency: e.target.value })} />
          <Select
            label="Language"
            value={store.language}
            onChange={(e) => update('store', { ...store, language: e.target.value })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'ar', label: 'Arabic' },
            ]}
          />
          <Field label="Time Zone" value={store.timezone} onChange={(e) => update('store', { ...store, timezone: e.target.value })} />
          <Select
            label="Date Format"
            value={store.dateFormat}
            onChange={(e) => update('store', { ...store, dateFormat: e.target.value })}
            options={[
              { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY' },
              { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
              { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
            ]}
          />
          <Select
            label="Time Format"
            value={store.timeFormat}
            onChange={(e) => update('store', { ...store, timeFormat: e.target.value })}
            options={[
              { value: '12h', label: '12 Hour (AM/PM)' },
              { value: '24h', label: '24 Hour' },
            ]}
          />
        </div>
      </SectionCard>
    </div>
  );
}
