import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Select } from '../components/Select.js';
import { Toggle } from '../components/Toggle.js';

export function PosSection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const pos = settings.pos;

  return (
    <div className="space-y-6">
      <SectionCard title="Checkout Preferences" description="Configure default behavior during the checkout process.">
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <Select
            label="Default Payment Method"
            value={pos.defaultPaymentMethod}
            onChange={(e) => update('pos', { ...pos, defaultPaymentMethod: e.target.value as 'CASH' | 'CARD' })}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'CARD', label: 'Credit/Debit Card' },
            ]}
          />
          <Select
            label="Total Rounding"
            value={pos.roundingOption}
            onChange={(e) => update('pos', { ...pos, roundingOption: e.target.value as typeof pos.roundingOption })}
            options={[
              { value: 'none', label: 'No Rounding' },
              { value: 'nearest_05', label: 'Round to nearest 0.05' },
              { value: 'nearest_10', label: 'Round to nearest 0.10' },
              { value: 'up', label: 'Always round up' },
              { value: 'down', label: 'Always round down' },
            ]}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Toggle
            label="Auto-Open Cash Drawer"
            description="Automatically pop the drawer open when a cash sale completes."
            checked={pos.autoCashDrawer}
            onChange={(val) => update('pos', { ...pos, autoCashDrawer: val })}
          />
          <Toggle
            label="Auto-Print Receipt"
            description="Automatically print a receipt when a sale completes."
            checked={pos.autoPrintReceipt}
            onChange={(val) => update('pos', { ...pos, autoPrintReceipt: val })}
          />
          <Toggle
            label="Confirm Before Completion"
            description="Require an extra confirmation step before finalizing a sale."
            checked={pos.confirmBeforeCompleteSale}
            onChange={(val) => update('pos', { ...pos, confirmBeforeCompleteSale: val })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Input & Hardware" description="Barcode scanning and keyboard options.">
        <div className="grid gap-4 md:grid-cols-2">
          <Toggle
            label="Enable Barcode Scanner"
            description="Listen for barcode scanner input on the POS screen."
            checked={pos.enableBarcodeScanner}
            onChange={(val) => update('pos', { ...pos, enableBarcodeScanner: val })}
          />
          <Toggle
            label="Barcode Scan Sound"
            description="Play an audio beep when an item is scanned."
            checked={pos.barcodeScanSound}
            onChange={(val) => update('pos', { ...pos, barcodeScanSound: val })}
          />
          <Toggle
            label="Keyboard Shortcuts"
            description="Allow using keyboard shortcuts for common POS actions."
            checked={pos.enableKeyboardShortcuts}
            onChange={(val) => update('pos', { ...pos, enableKeyboardShortcuts: val })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Permissions & Limits" description="Configure what cashiers are allowed to do during checkout.">
        <div className="grid gap-4 md:grid-cols-2">
          <Toggle label="Enable Discounts" description="Allow applying discounts to items or the total." checked={pos.enableDiscounts} onChange={(val) => update('pos', { ...pos, enableDiscounts: val })} />
          <Toggle label="Enable Returns" description="Allow processing returns." checked={pos.enableReturns} onChange={(val) => update('pos', { ...pos, enableReturns: val })} />
          <Toggle label="Enable Refunds" description="Allow processing refunds for past transactions." checked={pos.enableRefunds} onChange={(val) => update('pos', { ...pos, enableRefunds: val })} />
          <Toggle label="Allow Manual Price Changes" description="Allow modifying the unit price of items in the cart." checked={pos.allowManualPriceChanges} onChange={(val) => update('pos', { ...pos, allowManualPriceChanges: val })} />
          <Toggle label="Allow Manual Quantity Changes" description="Allow changing item quantities manually." checked={pos.allowManualQuantityChanges} onChange={(val) => update('pos', { ...pos, allowManualQuantityChanges: val })} />
        </div>
      </SectionCard>
    </div>
  );
}
