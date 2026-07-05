import { type ReactNode } from 'react';

export function SectionCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          {footer}
        </div>
      )}
    </section>
  );
}
