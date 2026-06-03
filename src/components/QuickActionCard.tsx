import { Link } from 'react-router-dom';
import { NavIcon } from './NavIcon.js';
import type { NavIconName } from '../config/nav.js';

export function QuickActionCard({
  to,
  label,
  description,
  icon,
  accent = 'mint'
}: {
  to: string;
  label: string;
  description: string;
  icon: NavIconName;
  accent?: 'mint' | 'gold' | 'sky' | 'amber';
}) {
  return (
    <Link to={to} className={`quick-action quick-action--${accent}`}>
      <span className="quick-action__icon">
        <NavIcon name={icon} />
      </span>
      <span className="quick-action__label">{label}</span>
      <span className="quick-action__desc">{description}</span>
    </Link>
  );
}
