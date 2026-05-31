export type Role = 'ADMIN' | 'CASHIER' | 'STOCK_MANAGER';
export type Unit = 'KG' | 'PIECE' | 'LITER';
export type PaymentMethod = 'CASH' | 'CARD';
export type DiscountType = 'PERCENT' | 'FIXED';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  categoryId: string;
  category: Category;
  price: string | number;
  costPrice: string | number;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: Unit;
  imageUrl?: string | null;
  expiryTracked: boolean;
  active: boolean;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  loyaltyPoints: number;
  sales?: Array<{ id: string; receiptNumber: string; createdAt: string; total: string | number }>;
};

export type SaleItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
};

export type Sale = {
  id: string;
  receiptNumber: string;
  subtotal: string | number;
  discountAmount: string | number;
  total: string | number;
  amountPaid: string | number;
  changeAmount: string | number;
  createdAt: string;
  customer?: Customer | null;
  user?: AuthUser;
  items: SaleItem[];
  payments: Array<{ id: string; method: PaymentMethod; amount: string | number }>;
};

export type InventoryMovement = {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: 'DAMAGED' | 'EXPIRED' | 'COUNTED' | 'OTHER' | null;
  note?: string | null;
  createdAt: string;
  product: Product;
  supplier?: { id: string; name: string } | null;
  createdBy?: AuthUser | null;
};

export type AdjustmentReason = 'DAMAGED' | 'EXPIRED' | 'COUNTED' | 'OTHER';

export type DashboardSummary = {
  todaySales: { count: number; revenue: number };
  lowStockProducts: Product[];
  activeCashiers: number;
  revenueLast7Days: Array<{ date: string; total: number }>;
  topProducts: Array<{ productId: string; name: string; sku: string; quantity: number; revenue: number }>;
};

export type ReportSummary = {
  range: 'daily' | 'weekly' | 'monthly';
  summary: { revenue: number; cost: number; profit: number; subtotal: number };
  salesByDay: Array<{ date: string; total: number }>;
  itemCount: number;
};

export type TopProduct = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
};

export type Hold = {
  id: string;
  payload: unknown;
  cashier: AuthUser;
  createdAt: string;
  updatedAt: string;
};

export type ActivityLog = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: unknown;
  createdAt: string;
  user?: AuthUser | null;
};
