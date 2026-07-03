import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import type { ActivityLog } from '../api/types.js';
import { SectionCard } from '../components/SectionCard.js';
import { formatDate } from '../lib/format.js';

export function ActivityPage() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; startedAt: string; user: { name: string; username: string; role: string } }>>([]);

  useEffect(() => {
    void Promise.all([
      apiFetch<{ activity: ActivityLog[] }>('/activity'),
      apiFetch<{ sessions: Array<{ id: string; startedAt: string; user: { name: string; username: string; role: string } }> }>('/cashier/sessions')
    ])
      .then(([activityResult, sessionResult]) => {
        setActivity(activityResult.activity);
        setSessions(sessionResult.sessions);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-400">Audit trail</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Activity log and live sessions</h1>
      </div>

      <SectionCard title="Active cashier sessions" subtitle="Currently open checkout sessions">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="font-medium text-white">{session.user.name}</p>
              <p className="text-sm text-slate-400">{session.user.username}</p>
              <p className="mt-2 text-sm text-gold-300">{session.user.role}</p>
              <p className="mt-1 text-xs text-slate-500">Started {formatDate(session.startedAt)}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Activity history" subtitle="Who did what and when">
        <div className="space-y-3">
          {activity.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{entry.action}</p>
                  <p className="text-sm text-slate-400">{entry.entity} {entry.entityId ? `· ${entry.entityId}` : ''}</p>
                </div>
                <p className="text-sm text-slate-300">{formatDate(entry.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-400">By {entry.user?.name ?? 'System'}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
