import type { ReactNode } from 'react';

type Variant = 'login' | 'app';

export function SupermarketBackground({
  children,
  variant = 'app',
  className = ''
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <div className={`supermarket-bg supermarket-bg--${variant} ${className}`.trim()}>
      <div className="supermarket-bg__backdrop" aria-hidden="true">
        <img src="/assets/supermarket-bg.jpg" alt="" className="supermarket-bg__scene" />
        <div className="supermarket-bg__veil" />
      </div>
      <div className="supermarket-bg__content">{children}</div>
    </div>
  );
}
