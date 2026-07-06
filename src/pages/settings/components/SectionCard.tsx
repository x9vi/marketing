import { type ReactNode } from 'react';

export function SectionCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--ink)' }}>{title}</h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{description}</p>
      </div>
      <div>
        {children}
      </div>
      {footer && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
