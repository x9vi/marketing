import type { ReactElement } from 'react';
import type { NavIconName } from '../config/nav.js';

const paths: Record<NavIconName, ReactElement> = {
  dashboard: (
    <path
      d="M4 11h6V4H4v7zm10 9h6v-7h-6v7zM4 20h6v-5H4v5zm10-9h6V4h-6v7z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  pos: (
    <>
      <path d="M3 7h18v10H3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 11h.01M11 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  sales: (
    <>
      <path d="M7 4h10v16H7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 8h6M10 12h6M10 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  products: (
    <>
      <path d="M4 7h16v2H4zM6 11h12v9H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  inventory: (
    <>
      <path d="M3 7h18v2H3zM7 11h10v6H7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  suppliers: (
    <>
      <path d="M4 10h16v10H4zM8 10V6h8v4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  customers: (
    <>
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  reports: (
    <>
      <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  employees: (
    <>
      <path d="M16 19v-2a4 4 0 00-8 0v2M12 11a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  activity: (
    <>
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    </>
  )
};

export function NavIcon({ name, className = '' }: { name: NavIconName; className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
