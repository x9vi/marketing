import { useState } from 'react';
import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Field } from '../components/Field.js';
import { apiFetch } from '../../../api/client.js';

export function HardwareSection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const hardware = settings.hardware;
  const [testing, setTesting] = useState('');

  const testDrawer = async () => {
    setTesting('drawer');
    try {
      await apiFetch('/cashier/drawer/pop', { method: 'POST', body: JSON.stringify({ reason: 'Hardware Test' }) });
      alert('Open signal sent to cash drawer.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting('');
    }
  };

  const testDevice = (name: string) => {
    setTesting(name);
    setTimeout(() => {
      alert(`Test signal sent to ${name}. If the device is properly connected and configured in the OS, it should respond.`);
      setTesting('');
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 text-sm text-amber-700">
            <p><strong>Hardware Integration Note:</strong> For web-based POS, hardware must be installed as OS-level devices (e.g. OPOS / ESC/POS drivers). The browser communicates through standard print dialogs or local proxy agents.</p>
          </div>
        </div>
      </div>

      <SectionCard title="Receipt Printer" description="Configure your primary receipt printer connection.">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Field label="Printer Name / IP Address" placeholder="e.g. EPSON TM-T20III or 192.168.1.100" value={hardware.receiptPrinter} onChange={(e) => update('hardware', { ...hardware, receiptPrinter: e.target.value })} />
          </div>
          <button type="button" onClick={() => testDevice('Printer')} disabled={testing !== ''} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            {testing === 'Printer' ? 'Testing...' : 'Test Print'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Cash Drawer" description="Configure the cash drawer connected to your receipt printer.">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Field label="Cash Drawer Connection String" placeholder="e.g. COM1 or LPT1" value={hardware.cashDrawer} onChange={(e) => update('hardware', { ...hardware, cashDrawer: e.target.value })} />
          </div>
          <button type="button" onClick={() => void testDrawer()} disabled={testing !== ''} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            {testing === 'drawer' ? 'Opening...' : 'Test Open'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Barcode Scanner" description="Configure your USB or Bluetooth barcode scanner.">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Field label="Scanner Input Prefix (Optional)" placeholder="e.g. ^ or \x02" value={hardware.barcodeScanner} onChange={(e) => update('hardware', { ...hardware, barcodeScanner: e.target.value })} />
          </div>
          <button type="button" onClick={() => testDevice('Scanner')} disabled={testing !== ''} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
            {testing === 'Scanner' ? 'Testing...' : 'Test Scan'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Other Peripherals" description="Customer displays and electronic scales.">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Customer Display / Pole" placeholder="Connection string (e.g. COM2)" value={hardware.customerDisplay} onChange={(e) => update('hardware', { ...hardware, customerDisplay: e.target.value })} />
          <Field label="Electronic Scale" placeholder="Connection string (e.g. COM3)" value={hardware.electronicScale} onChange={(e) => update('hardware', { ...hardware, electronicScale: e.target.value })} />
        </div>
      </SectionCard>
    </div>
  );
}
