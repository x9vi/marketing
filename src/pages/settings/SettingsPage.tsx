import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../api/client.js';
import type { AppSettings } from './types.js';
import { defaultSettings } from './defaults.js';
import { useSettings } from '../../context/SettingsContext.js';
import './SettingsPage.css';

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

const CARDS: { id: TabId; section: string; icon: string; title: string; sub: string }[] = [
  { id: 'store', section: 'Store', icon: '🏪', title: 'Store Information', sub: 'Name, logo, contact & tax' },
  { id: 'admin', section: 'Store', icon: '👤', title: 'Administrator Account', sub: 'Login & password' },
  { id: 'taxes', section: 'Store', icon: '💰', title: 'Taxes & Pricing', sub: 'Rates, currency & rounding' },
  { id: 'pos', section: 'Selling', icon: '🖥️', title: 'POS & Checkout', sub: 'Payment & sale behaviour' },
  { id: 'receipt', section: 'Selling', icon: '🧾', title: 'Receipt', sub: 'Layout & printed content' },
  { id: 'hardware', section: 'Hardware & Stock', icon: '🖨️', title: 'Hardware', sub: 'Printer, drawer & scanner' },
  { id: 'inventory', section: 'Hardware & Stock', icon: '📦', title: 'Inventory', sub: 'Stock alerts & SKU' },
  { id: 'backup', section: 'System', icon: '💾', title: 'Backup & Restore', sub: 'Export, import & auto-backup' },
  { id: 'notifications', section: 'System', icon: '🔔', title: 'Notifications', sub: 'Alerts & reminders' },
  { id: 'appearance', section: 'System', icon: '🎨', title: 'Appearance', sub: 'Theme, color & font' },
  { id: 'security', section: 'System', icon: '🔒', title: 'Security', sub: 'Logout, PIN & attempts' },
  { id: 'database', section: 'System', icon: '🗄️', title: 'Database', sub: 'Stats & maintenance' }
];

export function SettingsPage() {
  const { refreshSettings } = useSettings();
  const [activeModal, setActiveModal] = useState<TabId | null>(null);
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
      void refreshSettings(); // Update global context immediately
      setActiveModal(null); // Close modal on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm font-medium text-slate-500">Loading settings...</div>
      </div>
    );
  }

  const renderSection = (id: TabId) => {
    switch (id) {
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

  const sections = ['Store', 'Selling', 'Hardware & Stock', 'System'];

  return (
    <div className="settings-page-wrapper">
      <div className="page-head">
        <h1>Settings</h1>
        <p>Configure your store, hardware, and system preferences</p>
      </div>

      {sections.map(sectionName => (
        <div key={sectionName}>
          <div className="section-label">{sectionName}</div>
          <div className="grid">
            {CARDS.filter(c => c.section === sectionName).map(card => (
              <div 
                key={card.id} 
                className="card" 
                onClick={() => { setActiveModal(card.id); setMessage(''); setError(''); }}
              >
                <div className="icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <div className="sub">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Overlay Modal */}
      {activeModal && (
        <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="panel">
            {(() => {
              const activeCard = CARDS.find(c => c.id === activeModal);
              return (
                <>
                  <div className="panel-head">
                    <div className="icon">{activeCard?.icon}</div>
                    <div>
                      <h2>{activeCard?.title}</h2>
                      <span>{activeCard?.sub}</span>
                    </div>
                    <button className="close" onClick={() => setActiveModal(null)}>✕</button>
                  </div>
                  <div className="panel-body">
                    {/* Render the actual React component for this section */}
                    {renderSection(activeModal)}
                    
                    {/* Show error/success messages if any exist */}
                    {message && <div style={{marginTop: '16px', padding: '12px', background: '#d1fae5', color: '#065f46', borderRadius: '8px'}}>{message}</div>}
                    {error && <div style={{marginTop: '16px', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px'}}>{error}</div>}
                  </div>
                  <div className="panel-foot">
                    <button className="btn-custom ghost" onClick={() => setActiveModal(null)}>Cancel</button>
                    {activeModal !== 'admin' && activeModal !== 'database' && (
                      <button 
                        className="btn-custom primary" 
                        disabled={saving || !dirty} 
                        onClick={() => void saveSettings()}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
