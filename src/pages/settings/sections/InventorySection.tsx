import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Field } from '../components/Field.js';
import { Toggle } from '../components/Toggle.js';

export function InventorySection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const inventory = settings.inventory;

  return (
    <div className="space-y-6">
      <SectionCard title="Stock Management" description="Rules for tracking inventory levels.">
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <Field 
            label="Default Low Stock Threshold" 
            type="number" 
            min="0" 
            value={String(inventory.lowStockThreshold)} 
            onChange={(e) => update('inventory', { ...inventory, lowStockThreshold: parseInt(e.target.value, 10) || 0 })} 
          />
          <Field 
            label="Expiry Warning Days" 
            type="number" 
            min="0" 
            value={String(inventory.expiryWarningDays)} 
            onChange={(e) => update('inventory', { ...inventory, expiryWarningDays: parseInt(e.target.value, 10) || 0 })} 
          />
        </div>
        <div className="grid gap-4">
          <Toggle 
            label="Allow Negative Stock" 
            description="Allow cashiers to sell items even if the system shows zero inventory." 
            checked={inventory.allowNegativeStock} 
            onChange={(val) => update('inventory', { ...inventory, allowNegativeStock: val })} 
          />
          <Toggle 
            label="Auto-Generate SKUs" 
            description="Automatically create SKUs for new products if left blank." 
            checked={inventory.autoGenerateSku} 
            onChange={(val) => update('inventory', { ...inventory, autoGenerateSku: val })} 
          />
          <Toggle 
            label="Enable Batch Tracking" 
            description="Track products by specific production batches and lot numbers." 
            checked={inventory.batchTracking} 
            onChange={(val) => update('inventory', { ...inventory, batchTracking: val })} 
          />
          <Toggle 
            label="Low Stock Alerts" 
            description="Show warnings on the dashboard when items fall below their threshold." 
            checked={inventory.lowStockAlert} 
            onChange={(val) => update('inventory', { ...inventory, lowStockAlert: val })} 
          />
        </div>
      </SectionCard>
    </div>
  );
}
