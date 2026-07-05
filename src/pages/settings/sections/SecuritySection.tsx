import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Field } from '../components/Field.js';
import { Toggle } from '../components/Toggle.js';

export function SecuritySection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const security = settings.security;

  return (
    <div className="space-y-6">
      <SectionCard title="Session & Login" description="Control how users authenticate and stay logged in.">
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <Field 
            label="Session Timeout (Minutes)" 
            type="number" 
            min="1" 
            value={String(security.sessionTimeoutMinutes)} 
            onChange={(e) => update('security', { ...security, sessionTimeoutMinutes: parseInt(e.target.value, 10) || 60 })} 
          />
          <Field 
            label="Maximum Login Attempts" 
            type="number" 
            min="1" 
            value={String(security.maxLoginAttempts)} 
            onChange={(e) => update('security', { ...security, maxLoginAttempts: parseInt(e.target.value, 10) || 5 })} 
          />
          <Field 
            label="Remember Me Duration (Days)" 
            type="number" 
            min="0" 
            value={String(security.rememberMeDays)} 
            onChange={(e) => update('security', { ...security, rememberMeDays: parseInt(e.target.value, 10) || 7 })} 
          />
        </div>
        <div className="grid gap-4">
          <Toggle 
            label="Auto Logout" 
            description="Automatically log out users when they close the browser tab." 
            checked={security.autoLogout} 
            onChange={(val) => update('security', { ...security, autoLogout: val })} 
          />
          <Toggle 
            label="PIN Login" 
            description="Allow cashiers to quickly switch accounts using a 4-digit PIN." 
            checked={security.pinLogin} 
            onChange={(val) => update('security', { ...security, pinLogin: val })} 
          />
        </div>
      </SectionCard>
    </div>
  );
}
