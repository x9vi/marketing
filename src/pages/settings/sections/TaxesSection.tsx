import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Field } from '../components/Field.js';
import { Select } from '../components/Select.js';
import { Toggle } from '../components/Toggle.js';

export function TaxesSection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const taxes = settings.taxes;

  return (
    <div className="space-y-6">
      <SectionCard title="Tax Configuration" description="Set up how taxes are calculated across the store.">
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <Field 
            label="Default Tax Rate (%)" 
            type="number" 
            min="0" 
            max="100" 
            step="0.01" 
            value={String(taxes.defaultRate)} 
            onChange={(e) => update('taxes', { ...taxes, defaultRate: parseFloat(e.target.value) || 0 })} 
          />
        </div>
        <div className="grid gap-4 md:grid-cols-1">
          <Toggle 
            label="Tax Inclusive Pricing" 
            description="If enabled, product prices already include tax. If disabled, tax is added at checkout." 
            checked={taxes.inclusivePricing} 
            onChange={(val) => update('taxes', { ...taxes, inclusivePricing: val })} 
          />
        </div>
      </SectionCard>

      <SectionCard title="Pricing & Currency Display" description="How monetary values are formatted and displayed.">
        <div className="grid gap-6 md:grid-cols-2">
          <Field 
            label="Currency Symbol" 
            placeholder="$" 
            value={taxes.currencySymbol} 
            onChange={(e) => update('taxes', { ...taxes, currencySymbol: e.target.value })} 
          />
          <Select
            label="Symbol Position"
            value={taxes.currencyPosition}
            onChange={(e) => update('taxes', { ...taxes, currencyPosition: e.target.value as 'left' | 'right' })}
            options={[
              { value: 'left', label: 'Left (e.g. $10.00)' },
              { value: 'right', label: 'Right (e.g. 10.00€)' },
            ]}
          />
          <Select
            label="Decimal Places"
            value={String(taxes.decimalPlaces)}
            onChange={(e) => update('taxes', { ...taxes, decimalPlaces: parseInt(e.target.value, 10) })}
            options={[
              { value: '0', label: '0 (e.g. $10)' },
              { value: '2', label: '2 (e.g. $10.00)' },
              { value: '3', label: '3 (e.g. $10.000)' },
            ]}
          />
        </div>
        
        <div className="mt-6">
          <Toggle 
            label="Round Totals Automatically" 
            description="Apply the global checkout rounding option to all tax calculations." 
            checked={taxes.roundTotals} 
            onChange={(val) => update('taxes', { ...taxes, roundTotals: val })} 
          />
        </div>
      </SectionCard>
    </div>
  );
}
