import { useState } from 'react';
import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Field } from '../components/Field.js';
import { Toggle } from '../components/Toggle.js';
import { apiFetch, apiUrl } from '../../../api/client.js';

export function BackupSection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const backup = settings.backup;
  const [downloading, setDownloading] = useState(false);

  const downloadBackup = () => {
    setDownloading(true);
    // Since we need to download a file, we can navigate or use a hidden iframe
    const link = document.createElement('a');
    link.href = apiUrl('/settings/db-backup');
    link.download = 'backup.db';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1000);
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Manual Backup & Restore" description="Safely backup or restore your entire SQLite database.">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Export Database</h4>
            <p className="mb-6 text-xs text-slate-500">Download a copy of your database. Keep this file safe as it contains all your products, sales, and settings.</p>
            <button
              type="button"
              onClick={downloadBackup}
              disabled={downloading}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {downloading ? 'Downloading...' : 'Download Backup'}
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Import Database</h4>
            <p className="mb-6 text-xs text-slate-500">Restore your POS from a previous backup file. This will overwrite all current data.</p>
            <button
              type="button"
              className="w-full rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              onClick={() => alert('To restore the database, please replace the SQLite file manually in the server directory or use the CLI. Web import is restricted for safety.')}
            >
              Restore Backup
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Automated Backups" description="Configure background backups.">
        <div className="grid gap-4">
          <Toggle 
            label="Enable Automatic Backups" 
            description="Automatically create a backup copy every night." 
            checked={backup.automaticBackup} 
            onChange={(val) => update('backup', { ...backup, automaticBackup: val })} 
          />
          {backup.automaticBackup && (
            <div className="mt-4">
              <Field 
                label="Backup Location (Server Path)" 
                placeholder="e.g. /var/backups/freshmart" 
                value={backup.backupLocation} 
                onChange={(e) => update('backup', { ...backup, backupLocation: e.target.value })} 
              />
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
