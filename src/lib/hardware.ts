/**
 * hardware.ts — POS Hardware Abstraction Layer
 *
 * Centralises all receipt-printer and cash-drawer interactions.
 * Phase 1: browser window.print() for receipts; server-logged pop for drawer.
 * Future: ESC/POS direct path via configurable interfaceType.
 */

import { apiFetch } from '../api/client.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HardwareSettings {
  receiptPrinter: {
    enabled: boolean;
    interfaceType: 'browser' | 'escpos';
    devicePath: string;
    printerName: string;
  };
  cashDrawer: {
    enabled: boolean;
    triggerViaDrawerKick: boolean;
    drawerPort: string;
  };
  station: {
    id: string;
    name: string;
  };
}

export const defaultHardwareSettings: HardwareSettings = {
  receiptPrinter: { enabled: false, interfaceType: 'browser', devicePath: '', printerName: '' },
  cashDrawer: { enabled: false, triggerViaDrawerKick: true, drawerPort: '' },
  station: { id: 'POS-1', name: 'Main Register' },
};

// ─── Settings API ─────────────────────────────────────────────────────────────

export async function loadHardwareSettings(): Promise<HardwareSettings> {
  try {
    const result = await apiFetch<{ settings: HardwareSettings }>('/settings');
    return result.settings;
  } catch {
    return { ...defaultHardwareSettings };
  }
}

export async function saveHardwareSettings(settings: HardwareSettings): Promise<HardwareSettings> {
  const result = await apiFetch<{ settings: HardwareSettings }>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return result.settings;
}

// ─── Cash Drawer Pop ──────────────────────────────────────────────────────────

/**
 * Send a drawer pop command.
 * - Posts to /cashier/drawer/pop → logged to ActivityLog server-side.
 * - Passes optional station ID header from settings.
 * - Returns { ok: boolean, error?: string }.
 */
export async function popCashDrawer(
  settings: HardwareSettings,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!settings.cashDrawer.enabled) {
    return { ok: true }; // Silently succeed when disabled
  }
  try {
    await apiFetch('/cashier/drawer/pop', {
      method: 'POST',
      headers: { 'x-station-id': settings.station.id },
      body: JSON.stringify({ reason: reason ?? 'Sale completed' }),
    });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Drawer pop failed';
    return { ok: false, error: msg };
  }
}

// ─── Receipt Printing ─────────────────────────────────────────────────────────

/**
 * Print a sale receipt.
 * Uses browser window.print() via a hidden iframe — works with any default printer.
 * Returns immediately; printing happens asynchronously in the hidden frame.
 */
export function printSaleReceipt(
  receiptHtml: string,
  onDone?: () => void
): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;left:-9999px;top:-9999px';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document ?? iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    onDone?.();
    return;
  }

  doc.open();
  doc.write(receiptHtml);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* already removed */ }
        onDone?.();
      }, 1500);
    }
  }, 300);
}
