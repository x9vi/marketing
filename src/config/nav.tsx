import type { Role } from '../api/types.js';

export type NavIconName =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'products'
  | 'inventory'
  | 'suppliers'
  | 'customers'
  | 'reports'
  | 'employees'
  | 'activity';

export type NavItem = {
  to: string;
  label: string;
  description: string;
  icon: NavIconName;
  roles: Role[];
  end?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        to: '/app',
        label: 'Command center',
        description: 'KPIs, alerts & quick actions',
        icon: 'dashboard',
        roles: ['ADMIN'],
        end: true
      }
    ]
  },
  {
    title: 'Store floor',
    items: [
      {
        to: '/app/pos',
        label: 'Point of sale',
        description: 'Checkout & receipts',
        icon: 'pos',
        roles: ['ADMIN', 'CASHIER']
      },
      {
        to: '/app/sales',
        label: 'Sales history',
        description: 'Receipts & transactions',
        icon: 'sales',
        roles: ['ADMIN']
      },
      {
        to: '/app/customers',
        label: 'Customers',
        description: 'Loyalty & purchase history',
        icon: 'customers',
        roles: ['ADMIN', 'CASHIER']
      }
    ]
  },
  {
    title: 'Stock & catalog',
    items: [
      {
        to: '/app/products',
        label: 'Products',
        description: 'SKUs, pricing & categories',
        icon: 'products',
        roles: ['ADMIN', 'STOCK_MANAGER']
      },
      {
        to: '/app/inventory',
        label: 'Inventory',
        description: 'Stock-in, adjustments & moves',
        icon: 'inventory',
        roles: ['ADMIN', 'STOCK_MANAGER']
      },
      {
        to: '/app/suppliers',
        label: 'Suppliers',
        description: 'Vendors & purchase contacts',
        icon: 'suppliers',
        roles: ['ADMIN', 'STOCK_MANAGER']
      }
    ]
  },
  {
    title: 'Insights & team',
    items: [
      {
        to: '/app/reports',
        label: 'Reports',
        description: 'Revenue, profit & exports',
        icon: 'reports',
        roles: ['ADMIN']
      },
      {
        to: '/app/activity',
        label: 'Activity log',
        description: 'Audit trail & live sessions',
        icon: 'activity',
        roles: ['ADMIN']
      },
      {
        to: '/app/employees',
        label: 'Team & roles',
        description: 'Staff accounts & access',
        icon: 'employees',
        roles: ['ADMIN']
      }
    ]
  }
];

export function navItemsForRole(role: Role): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role))
    }))
    .filter((group) => group.items.length > 0);
}

export function defaultAppPath(role: Role): string {
  if (role === 'ADMIN') return '/app';
  if (role === 'CASHIER') return '/app/pos';
  return '/app/products';
}
