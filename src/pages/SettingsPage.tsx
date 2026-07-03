import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

const defaultSettings = {
  store: {
    name: 'FreshMart',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    currency: 'IQD',
    timezone: 'UTC'
  },
  pos: {
    receiptWidth: '80mm',
    autoPrintReceipt: true,
    defaultPaymentMethod: 'CASH'
  },
  taxes: {
    inclusivePricing: false,
    defaultRate: 0
  },
  receipt: {
    header: 'Thank you for shopping with us',
    footer: 'Please come again'
  },
  security: {
    rememberMeDays: 7
  }
};

type SettingsDoc = typeof defaultSettings;

type SaveResult = { settings: SettingsDoc };

type ProfileForm = {
  username: string;
  name: string;
  password: string;
  confirmPassword: string;
};

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span className="font-medium text-white">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-gold-400"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${checked ? 'border-mint-400/40 bg-mint-400/10' : 'border-white/10 bg-slate-950'}`}
    >
      <span className="text-sm text-white">{label}</span>
      <span className={`h-6 w-11 rounded-full p-1 transition-colors ${checked ? 'bg-mint-500' : 'bg-slate-700'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

export function SettingsPage() {
  const { user, refresh } = useAuth();
  const [settings, setSettings] = useState<SettingsDoc>(defaultSettings);
  const [profile, setProfile] = useState<ProfileForm>({ username: '', name: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([apiFetch<SaveResult>('/settings'), apiFetch<{ user: { id: string; username: string; name: string } }>('/auth/me')])
      .then(([settingsResult, meResult]) => {
        setSettings(settingsResult.settings);
        setProfile({
          username: meResult.user.username,
          name: meResult.user.name,
          password: '',
          confirmPassword: ''
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(defaultSettings), [settings]);

  const update = <K extends keyof SettingsDoc>(section: K, value: SettingsDoc[K]) => {
    setSettings((current) => ({ ...current, [section]: value }));
    setMessage('');
    setError('');
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setMessage('');
    setError('');
    try {
      const result = await apiFetch<SaveResult>('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSettings(result.settings);
      setMessage('Settings saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const resetSettings = async () => {
    setSettings(defaultSettings);
    setSavingSettings(true);
    setMessage('');
    setError('');
    try {
      const result = await apiFetch<SaveResult>('/settings', {
        method: 'PUT',
        body: JSON.stringify(defaultSettings)
      });
      setSettings(result.settings);
      setMessage('Settings restored to defaults.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (profile.password && profile.password !== profile.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSavingProfile(true);
    setMessage('');
    setError('');
    try {
      await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          username: profile.username,
          name: profile.name,
          password: profile.password || undefined
        })
      });
      await refresh();
      setProfile((current) => ({ ...current, password: '', confirmPassword: '' }));
      setMessage('Administrator account updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update account');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-sm text-slate-300">Loading settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-400">System</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Store settings</h1>
        <p className="mt-2 text-sm text-slate-400">All configuration is stored in SQLite and persists across restarts.</p>
      </div>

      {message ? <div className="rounded-2xl border border-mint-400/30 bg-mint-400/10 px-4 py-3 text-sm text-mint-100">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <Section title="Administrator account" description="Update the permanent login used on this installation.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Username" value={profile.username} onChange={(value) => setProfile((current) => ({ ...current, username: value }))} />
          <Field label="Display name" value={profile.name} onChange={(value) => setProfile((current) => ({ ...current, name: value }))} />
          <Field label="New password" type="password" value={profile.password} onChange={(value) => setProfile((current) => ({ ...current, password: value }))} />
          <Field label="Confirm password" type="password" value={profile.confirmPassword} onChange={(value) => setProfile((current) => ({ ...current, confirmPassword: value }))} />
        </div>
        <button type="button" onClick={() => void saveProfile()} disabled={savingProfile} className="rounded-2xl bg-gold-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-60">
          {savingProfile ? 'Saving…' : 'Save account changes'}
        </button>
      </Section>

      <Section title="Store identity" description="Receipt and report information used across the app.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Store name" value={settings.store.name} onChange={(value) => update('store', { ...settings.store, name: value })} />
          <Field label="Tax number" value={settings.store.taxNumber} onChange={(value) => update('store', { ...settings.store, taxNumber: value })} />
          <Field label="Phone" value={settings.store.phone} onChange={(value) => update('store', { ...settings.store, phone: value })} />
          <Field label="Email" type="email" value={settings.store.email} onChange={(value) => update('store', { ...settings.store, email: value })} />
          <Field label="Address" value={settings.store.address} onChange={(value) => update('store', { ...settings.store, address: value })} />
          <Field label="Currency" value={settings.store.currency} onChange={(value) => update('store', { ...settings.store, currency: value })} />
        </div>
      </Section>

      <Section title="Checkout" description="POS and receipt behavior for this single store.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Receipt width" value={settings.pos.receiptWidth} onChange={(value) => update('pos', { ...settings.pos, receiptWidth: value })} />
          <Field label="Default payment method" value={settings.pos.defaultPaymentMethod} onChange={(value) => update('pos', { ...settings.pos, defaultPaymentMethod: value })} />
          <Field label="Remember-me days" type="number" value={String(settings.security.rememberMeDays)} onChange={(value) => update('security', { ...settings.security, rememberMeDays: Number(value || 0) })} />
        </div>
        <Toggle label="Auto print receipt" checked={settings.pos.autoPrintReceipt} onChange={(value) => update('pos', { ...settings.pos, autoPrintReceipt: value })} />
      </Section>

      <Section title="Taxes and receipts" description="Persisted tax and receipt text settings.">
        <div className="grid gap-4 md:grid-cols-2">
          <Toggle label="Tax inclusive pricing" checked={settings.taxes.inclusivePricing} onChange={(value) => update('taxes', { ...settings.taxes, inclusivePricing: value })} />
          <Field label="Default tax rate" type="number" value={String(settings.taxes.defaultRate)} onChange={(value) => update('taxes', { ...settings.taxes, defaultRate: Number(value || 0) })} />
          <Field label="Receipt header" value={settings.receipt.header} onChange={(value) => update('receipt', { ...settings.receipt, header: value })} />
          <Field label="Receipt footer" value={settings.receipt.footer} onChange={(value) => update('receipt', { ...settings.receipt, footer: value })} />
        </div>
      </Section>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void saveSettings()} disabled={savingSettings} className="rounded-2xl bg-mint-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-mint-400 disabled:cursor-not-allowed disabled:opacity-60">
          {savingSettings ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => void resetSettings()} disabled={savingSettings} className="rounded-2xl border border-white/10 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60">
          Reset to default
        </button>
        <span className="self-center text-sm text-slate-400">{dirty ? 'Unsaved edits are in memory only until saved.' : 'All settings are saved.'}</span>
      </div>
    </div>
  );
}
