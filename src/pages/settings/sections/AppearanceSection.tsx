import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Select } from '../components/Select.js';
import { Toggle } from '../components/Toggle.js';

export function AppearanceSection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const appearance = settings.appearance;

  return (
    <div className="space-y-6">
      <SectionCard title="Visual Theme" description="Change how the POS interface looks.">
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <Select
            label="Theme"
            value={appearance.theme}
            onChange={(e) => update('appearance', { ...appearance, theme: e.target.value as 'light' | 'dark' | 'system' })}
            options={[
              { value: 'light', label: 'Light Mode' },
              { value: 'dark', label: 'Dark Mode' },
              { value: 'system', label: 'System Default' },
            ]}
          />
          <Select
            label="Font Size"
            value={appearance.fontSize}
            onChange={(e) => update('appearance', { ...appearance, fontSize: e.target.value as 'small' | 'medium' | 'large' })}
            options={[
              { value: 'small', label: 'Small (More dense)' },
              { value: 'medium', label: 'Medium (Standard)' },
              { value: 'large', label: 'Large (Easier to read)' },
            ]}
          />
          <Select
            label="Accent Color"
            value={appearance.accentColor}
            onChange={(e) => update('appearance', { ...appearance, accentColor: e.target.value })}
            options={[
              { value: 'mint', label: 'FreshMint (Default)' },
              { value: 'blue', label: 'Ocean Blue' },
              { value: 'purple', label: 'Royal Purple' },
              { value: 'orange', label: 'Warm Orange' },
            ]}
          />
        </div>
        <div className="grid gap-4">
          <Toggle 
            label="Compact Mode" 
            description="Reduce padding and spacing to fit more items on the screen simultaneously." 
            checked={appearance.compactMode} 
            onChange={(val) => update('appearance', { ...appearance, compactMode: val })} 
          />
        </div>
      </SectionCard>
    </div>
  );
}
