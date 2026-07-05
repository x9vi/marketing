import type { AppSettings } from '../types.js';
import { SectionCard } from '../components/SectionCard.js';
import { Toggle } from '../components/Toggle.js';

export function NotificationsSection({ settings, update }: { settings: AppSettings; update: <K extends keyof AppSettings>(section: K, value: AppSettings[K]) => void }) {
  const notifications = settings.notifications;

  return (
    <div className="space-y-6">
      <SectionCard title="System Alerts" description="Configure which alerts appear on your dashboard.">
        <div className="grid gap-4">
          <Toggle 
            label="Low Stock Alerts" 
            description="Notify when a product's stock falls below its defined threshold." 
            checked={notifications.lowStockAlerts} 
            onChange={(val) => update('notifications', { ...notifications, lowStockAlerts: val })} 
          />
          <Toggle 
            label="Expiring Product Alerts" 
            description="Notify when perishable products are nearing their expiration date." 
            checked={notifications.expiringProductAlerts} 
            onChange={(val) => update('notifications', { ...notifications, expiringProductAlerts: val })} 
          />
          <Toggle 
            label="Printer Error Notifications" 
            description="Show alerts if the receipt printer is out of paper or disconnected." 
            checked={notifications.printerErrorNotifications} 
            onChange={(val) => update('notifications', { ...notifications, printerErrorNotifications: val })} 
          />
          <Toggle 
            label="Backup Reminders" 
            description="Remind administrators if no backup has been performed recently." 
            checked={notifications.backupReminder} 
            onChange={(val) => update('notifications', { ...notifications, backupReminder: val })} 
          />
          <Toggle 
            label="Failed Login Alerts" 
            description="Notify administrators of multiple failed login attempts." 
            checked={notifications.failedLoginAlerts} 
            onChange={(val) => update('notifications', { ...notifications, failedLoginAlerts: val })} 
          />
        </div>
      </SectionCard>
    </div>
  );
}
