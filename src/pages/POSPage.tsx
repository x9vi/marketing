import { useEffect, useMemo, useState } from 'react';
import { apiFetch, apiUrl } from '../api/client.js';
import type { Customer, Hold, PaymentMethod, Product, Sale, DiscountType } from '../api/types.js';
import { SectionCard } from '../components/SectionCard.js';
import { formatCurrency, formatDate } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.js';

type CartItem = {
  product: Product;
  quantity: number;
};

type HoldPayload = {
  items: Array<{ productId: string; quantity: number }>;
  customerId?: string;
  discountType?: DiscountType;
  discountValue?: number;
  payments?: Array<{ method: PaymentMethod; amount: number }>;
  pointsToRedeem?: number;
};

export function POSPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT');
  const [discountValue, setDiscountValue] = useState('0');
  const [pointsToRedeem, setPointsToRedeem] = useState('0');
  const [cashAmount, setCashAmount] = useState('0');
  const [cardAmount, setCardAmount] = useState('0');
  const [holdId, setHoldId] = useState('');
  const [holds, setHolds] = useState<Hold[]>([]);
  const [sale, setSale] = useState<Sale | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const discount = discountType === 'PERCENT' ? subtotal * (Number(discountValue) / 100) : Math.min(subtotal, Number(discountValue));
  const total = Math.max(0, subtotal - discount);
  const plannedCash = Number(cashAmount || 0);
  const plannedCard = Number(cardAmount || 0);
  const paid = plannedCash + plannedCard;
  const change = Math.max(0, paid - total);

  const loadHolds = async () => {
    const result = await apiFetch<{ holds: Hold[] }>('/sales/holds');
    setHolds(result.holds);
  };

  useEffect(() => {
    void loadHolds().catch(() => undefined);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      const result = await apiFetch<{ products: Product[] }>(`/products?query=${encodeURIComponent(query)}`);
      setSearchResults(result.products);
    };
    void run().catch(() => undefined);
  }, [query]);

  useEffect(() => {
    const run = async () => {
      if (customerQuery.trim().length < 2) {
        setCustomerResults([]);
        return;
      }
      const result = await apiFetch<{ customers: Customer[] }>(`/customers?query=${encodeURIComponent(customerQuery)}`);
      setCustomerResults(result.customers);
    };
    void run().catch(() => undefined);
  }, [customerQuery]);

  const addProduct = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const checkout = async () => {
    const payments = [
      ...(plannedCash ? [{ method: 'CASH' as PaymentMethod, amount: plannedCash }] : []),
      ...(plannedCard ? [{ method: 'CARD' as PaymentMethod, amount: plannedCard }] : [])
    ];

    const result = await apiFetch<{ sale: Sale }>('/sales/checkout', {
      method: 'POST',
      body: JSON.stringify({
        customerId: selectedCustomer?.id,
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        discountType,
        discountValue: Number(discountValue),
          pointsToRedeem: Number(pointsToRedeem),
        payments,
        holdId: holdId || undefined
      })
    });

    setSale(result.sale);
    setCart([]);
    setSelectedCustomer(null);
    setHoldId('');
    setDiscountValue('0');
    setPointsToRedeem('0');
    setCashAmount('0');
    setCardAmount('0');
    await loadHolds();
  };

  const saveHold = async () => {
    await apiFetch('/sales/hold', {
      method: 'POST',
      body: JSON.stringify({
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        customerId: selectedCustomer?.id,
        discountType,
        discountValue: Number(discountValue),
          pointsToRedeem: Number(pointsToRedeem),
        payments: [
          ...(plannedCash ? [{ method: 'CASH', amount: plannedCash }] : []),
          ...(plannedCard ? [{ method: 'CARD', amount: plannedCard }] : [])
        ]
      })
    });
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue('0');
    setPointsToRedeem('0');
    setCashAmount('0');
    setCardAmount('0');
    await loadHolds();
  };

  const resumeHold = (hold: Hold) => {
    const payload = hold.payload as HoldPayload;
    setHoldId(hold.id);
    setDiscountType(payload.discountType ?? 'PERCENT');
    setDiscountValue(String(payload.discountValue ?? 0));
    setPointsToRedeem(String(payload.pointsToRedeem ?? 0));
    setCashAmount(String(payload.payments?.find((payment) => payment.method === 'CASH')?.amount ?? 0));
    setCardAmount(String(payload.payments?.find((payment) => payment.method === 'CARD')?.amount ?? 0));
    const restore = async () => {
      if (payload.customerId) {
        const result = await apiFetch<{ customers: Customer[] }>(`/customers?query=${payload.customerId}`);
        setSelectedCustomer(result.customers[0] ?? null);
      }
      const productResult = await apiFetch<{ products: Product[] }>(`/products?ids=${payload.items.map((item) => item.productId).join(',')}`);
      setCart(
        payload.items
          .map((item) => {
            const product = productResult.products.find((entry: Product) => entry.id === item.productId);
            return product ? { product, quantity: item.quantity } : null;
          })
          .filter((item): item is CartItem => Boolean(item))
      );
    };
    void restore();
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setHoldId('');
    setSale(null);
    setDiscountValue('0');
    setCashAmount('0');
    setCardAmount('0');
  };

  const searchLabel = useMemo(() => (user?.role === 'CASHIER' ? 'Cashier lane' : 'Checkout desk'), [user?.role]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gold-400">Point of sale</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{searchLabel}</h1>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Change due</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(change)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Search products" subtitle="Scan a barcode or type a SKU">
          <div className="grid gap-4">
            <input
              autoFocus
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Scan barcode or enter SKU"
            />
            <div className="grid gap-3 md:grid-cols-2">
              {searchResults.map((product) => (
                <button key={product.id} onClick={() => addProduct(product)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/10">
                  <p className="font-medium text-white">{product.name}</p>
                  <p className="text-sm text-slate-400">SKU {product.sku}</p>
                  <p className="mt-2 text-sm text-slate-300">{formatCurrency(product.price)} · Stock {product.stockQuantity}</p>
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Customer search" subtitle="Match loyalty accounts at checkout">
          <div className="grid gap-4">
            <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search customer by name, phone, or email" />
            <div className="grid gap-2">
              {customerResults.map((customer) => (
                <button key={customer.id} onClick={() => setSelectedCustomer(customer)} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{customer.name}</p>
                      <p className="text-sm text-slate-400">{customer.phone ?? customer.email ?? 'No contact'}</p>
                    </div>
                    <p className="text-sm text-gold-300">{customer.loyaltyPoints} points</p>
                  </div>
                </button>
              ))}
            </div>
            {selectedCustomer ? <div className="rounded-2xl border border-mint-400/20 bg-mint-400/10 px-4 py-3 text-sm text-mint-50">Selected customer: {selectedCustomer.name}</div> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Cart" subtitle={`${cart.length} items`}> 
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.product.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{item.product.name}</p>
                    <p className="text-sm text-slate-400">{formatCurrency(item.product.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-1" onClick={() => setCart((current) => current.map((entry) => entry.product.id === item.product.id ? { ...entry, quantity: Math.max(1, entry.quantity - 1) } : entry))}>-</button>
                    <span className="w-10 text-center">{item.quantity}</span>
                    <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-1" onClick={() => setCart((current) => current.map((entry) => entry.product.id === item.product.id ? { ...entry, quantity: entry.quantity + 1 } : entry))}>+</button>
                    <button className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-1 text-red-100" onClick={() => setCart((current) => current.filter((entry) => entry.product.id !== item.product.id))}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm text-slate-300">
              Discount type
              <select className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={discountType} onChange={(event) => setDiscountType(event.target.value as DiscountType)}>
                <option value="PERCENT">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Discount value
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} />
            </label>
            <label className="text-sm text-slate-300">
              Points to redeem
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={pointsToRedeem} onChange={(event) => setPointsToRedeem(event.target.value)} />
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Cash amount
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} />
            </label>
            <label className="text-sm text-slate-300">
              Card amount
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={cardAmount} onChange={(event) => setCardAmount(event.target.value)} />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button disabled={!cart.length} onClick={() => void saveHold()} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-slate-200 disabled:opacity-50">Hold sale</button>
            <button disabled={!cart.length} onClick={() => void checkout()} className="rounded-2xl bg-gold-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">Complete sale</button>
            <button onClick={clearCart} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-slate-200">Clear</button>
          </div>
          {sale ? (
            <div className="mt-4 rounded-2xl border border-mint-400/20 bg-mint-400/10 p-4 text-sm text-mint-50">
              Receipt {sale.receiptNumber} saved on {formatDate(sale.createdAt)}. 
              <a className="ml-2 underline" href={apiUrl(`/sales/${sale.id}/receipt.pdf`)} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Held transactions" subtitle="Resume suspended baskets">
          <div className="space-y-3">
            {holds.map((hold) => (
              <button key={hold.id} onClick={() => resumeHold(hold)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">Hold #{hold.id.slice(0, 8)}</p>
                    <p className="text-sm text-slate-400">Cashier {hold.cashier.name}</p>
                  </div>
                  <p className="text-sm text-slate-300">{formatDate(hold.updatedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
