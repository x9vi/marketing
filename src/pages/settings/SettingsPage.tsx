import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../api/client.js';
import type { AppSettings } from './types.js';
import { defaultSettings } from './defaults.js';
import { SaveBar } from './components/SaveBar.js';

import { StoreSection } from './sections/StoreSection.js';
import { AdministratorSection } from './sections/AdministratorSection.js';
import { PosSection } from './sections/PosSection.js';
import { ReceiptSection } from './sections/ReceiptSection.js';
import { HardwareSection } from './sections/HardwareSection.js';
import { TaxesSection } from './sections/TaxesSection.js';
import { InventorySection } from './sections/InventorySection.js';
import { BackupSection } from './sections/BackupSection.js';
import { NotificationsSection } from './sections/NotificationsSection.js';
import { AppearanceSection } from './sections/AppearanceSection.js';
import { SecuritySection } from './sections/SecuritySection.js';
import { DatabaseSection } from './sections/DatabaseSection.js';

type TabId = 'store' | 'admin' | 'pos' | 'receipt' | 'hardware' | 'taxes' | 'inventory' | 'backup' | 'notifications' | 'appearance' | 'security' | 'database';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'store', label: 'Store Information', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
  { id: 'admin', label: 'Administrator', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { id: 'pos', label: 'POS & Checkout', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  { id: 'receipt', label: 'Receipt', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { id: 'hardware', label: 'Hardware', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg> },
  { id: 'taxes', label: 'Taxes & Pricing', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
  { id: 'inventory', label: 'Inventory', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
  { id: 'backup', label: 'Backup', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> },
  { id: 'notifications', label: 'Notifications', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
  { id: 'appearance', label: 'Appearance', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg> },
  { id: 'security', label: 'Security', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
  { id: 'database', label: 'Database', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg> },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('store');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ settings: AppSettings }>('/settings')
      .then((res) => {
        setSettings(res.settings);
        setSavedSettings(res.settings);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const update = <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => {
    setSettings((current) => ({ ...current, [section]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await apiFetch<{ settings: AppSettings }>('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(result.settings);
      setSavedSettings(result.settings);
      setMessage('Settings saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm font-medium text-slate-500">Loading settings...</div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeTab) {
      case 'store': return <StoreSection settings={settings} update={update} />;
      case 'admin': return <AdministratorSection />;
      case 'pos': return <PosSection settings={settings} update={update} />;
      case 'receipt': return <ReceiptSection settings={settings} update={update} />;
      case 'hardware': return <HardwareSection settings={settings} update={update} />;
      case 'taxes': return <TaxesSection settings={settings} update={update} />;
      case 'inventory': return <InventorySection settings={settings} update={update} />;
      case 'backup': return <BackupSection settings={settings} update={update} />;
      case 'notifications': return <NotificationsSection settings={settings} update={update} />;
      case 'appearance': return <AppearanceSection settings={settings} update={update} />;
      case 'security': return <SecuritySection settings={settings} update={update} />;
      case 'database': return <DatabaseSection />;
      default: return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-slate-50 md:flex-row">
      <div className="w-full shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:w-64 lg:w-72">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your POS system</p>
        </div>
        <nav className="space-y-1 px-3 pb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setMessage('');
                setError('');
              }}
              className={`flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className={`mr-3 ${activeTab === tab.id ? 'text-blue-700' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-4xl">
            {renderSection()}
          </div>
        </div>
        {activeTab !== 'admin' && activeTab !== 'database' && (
          <div className="shrink-0 bg-white px-6 lg:px-10">
            <div className="mx-auto max-w-4xl">
              <SaveBar
                isSaving={saving}
                dirty={dirty}
                message={message}
                error={error}
                onSave={() => void saveSettings()}
                onReset={resetSettings}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
