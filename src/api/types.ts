export type Role = 'ADMIN' | 'CASHIER' | 'STOCK_MANAGER';
export type Unit = 'KG' | 'PIECE' | 'LITER';
export type PaymentMethod = 'CASH' | 'CARD';
export type DiscountType = 'PERCENT' | 'FIXED';
export type CouponType = 'PERCENT' | 'FIXED' | 'BOGO';
export type PromotionType = 'BOGO' | 'MULTI_BUY' | 'PERCENT_OFF' | 'FIXED_OFF';
export type DrawerStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'CASH_IN' | 'CASH_OUT' | 'SALE' | 'REFUND';

export type AuthUser = {
  id: string;
  username: string;
  email?: string | null;
  name: string;
  role: Role;
  active?: boolean;
};

export type TaxCategory = {
  id: string;
  name: string;
  rate: string | number;
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
  taxCategoryId?: string | null;
  taxCategory?: TaxCategory | null;
  price: string | number;
  costPrice: string | number;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: Unit;
  imageUrl?: string | null;
  expiryTracked: boolean;
  ageRestricted: boolean;
  minAge: number;
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
  taxAmount: string | number;
  lineTotal: string | number;
  voided: boolean;
};

export type Sale = {
  id: string;
  receiptNumber: string;
  status: 'COMPLETED' | 'HELD' | 'VOIDED' | 'REFUNDED';
  subtotal: string | number;
  discountAmount: string | number;
  couponDiscount: string | number;
  taxAmount: string | number;
  total: string | number;
  amountPaid: string | number;
  changeAmount: string | number;
  pointsEarned: number;
  pointsRedeemed: number;
  createdAt: string;
  customer?: Customer | null;
  user?: AuthUser;
  items: SaleItem[];
  payments: Array<{ id: string; method: PaymentMethod; amount: string | number }>;
  refunds?: Refund[];
  appliedPromotions?: AppliedPromotionEntry[];
};

export type Refund = {
  id: string;
  originalSaleId: string;
  reason?: string | null;
  amount: string | number;
  createdAt: string;
  createdBy?: AuthUser;
  items: RefundItem[];
};

export type RefundItem = {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  amount: string | number;
};

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: string | number;
  minPurchase: string | number;
  maxUses?: number | null;
  usedCount: number;
  validFrom: string;
  validUntil?: string | null;
  active: boolean;
};

export type Promotion = {
  id: string;
  name: string;
  type: PromotionType;
  config: unknown;
  productIds: string[];
  categoryIds: string[];
  validFrom: string;
  validUntil?: string | null;
  active: boolean;
  priority: number;
};

export type AppliedPromotionEntry = {
  id: string;
  promotionId: string;
  promotion?: Promotion;
  discount: string | number;
  description: string;
};

export type InventoryMovement = {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'REFUND';
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

export type CashDrawer = {
  id: string;
  userId: string;
  user?: AuthUser;
  openingFloat: string | number;
  closingFloat?: string | number | null;
  status: DrawerStatus;
  openedAt: string;
  closedAt?: string | null;
  movements?: CashMovement[];
};

export type CashMovement = {
  id: string;
  drawerId: string;
  type: CashMovementType;
  amount: string | number;
  reason?: string | null;
  reference?: string | null;
  createdById: string;
  createdBy?: AuthUser;
  createdAt: string;
};

export type ZReport = {
  sessionStart: string;
  sessionEnd: string;
  cashier: string;
  openingFloat: number;
  totalSales: number;
  salesCount: number;
  cashSales: number;
  cardSales: number;
  totalRefunds: number;
  refundsCount: number;
  totalVoids: number;
  voidsCount: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  closingFloat?: number;
  difference?: number;
};

export type CouponValidation = {
  valid: boolean;
  coupon?: Coupon;
  discount?: number;
  message?: string;
};

export type PromotionMatch = {
  promotionId: string;
  name: string;
  type: PromotionType;
  discount: number;
  description: string;
  affectedItems: string[];
};
