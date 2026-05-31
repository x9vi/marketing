import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import type { AdjustmentReason, InventoryMovement, Product, Supplier } from '../api/types.js';
import { SectionCard } from '../components/SectionCard.js';
import { formatCurrency, formatDate } from '../lib/format.js';

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [stockIn, setStockIn] = useState({ productId: '', quantity: '0', supplierId: '', reference: '', note: '', expiresAt: '' });
  const [adjustment, setAdjustment] = useState({ productId: '', quantity: '0', reason: 'DAMAGED' as AdjustmentReason, note: '' });

  const refresh = async () => {
    const [productResult, supplierResult, movementResult] = await Promise.all([
      apiFetch<{ products: Product[] }>('/products?lowStock=true'),
      apiFetch<{ suppliers: Supplier[] }>('/suppliers'),
      apiFetch<{ movements: InventoryMovement[] }>('/inventory/movements')
    ]);
    setProducts(productResult.products);
    setSuppliers(supplierResult.suppliers);
    setMovements(movementResult.movements);
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  const submitStockIn = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiFetch('/inventory/stock-in', {
      method: 'POST',
      body: JSON.stringify({
        ...stockIn,
        quantity: Number(stockIn.quantity)
      })
    });
    setStockIn({ productId: '', quantity: '0', supplierId: '', reference: '', note: '', expiresAt: '' });
    await refresh();
  };

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiFetch('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        ...adjustment,
        quantity: Number(adjustment.quantity)
      })
    });
    setAdjustment({ productId: '', quantity: '0', reason: 'DAMAGED', note: '' });
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-400">Inventory</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Stock control and receiving</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Stock-in record">
          <form onSubmit={submitStockIn} className="grid gap-3 md:grid-cols-2">
            <select className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={stockIn.productId} onChange={(event) => setStockIn((current) => ({ ...current, productId: event.target.value }))}>
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={stockIn.quantity} onChange={(event) => setStockIn((current) => ({ ...current, quantity: event.target.value }))} placeholder="Quantity" />
            <select className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={stockIn.supplierId} onChange={(event) => setStockIn((current) => ({ ...current, supplierId: event.target.value }))}>
              <option value="">Supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
            <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={stockIn.reference} onChange={(event) => setStockIn((current) => ({ ...current, reference: event.target.value }))} placeholder="Reference" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-2" value={stockIn.note} onChange={(event) => setStockIn((current) => ({ ...current, note: event.target.value }))} placeholder="Note" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={stockIn.expiresAt} onChange={(event) => setStockIn((current) => ({ ...current, expiresAt: event.target.value }))} type="date" />
            <button className="rounded-2xl bg-gold-500 px-4 py-2 font-semibold text-slate-950">Receive stock</button>
          </form>
        </SectionCard>

        <SectionCard title="Stock adjustment">
          <form onSubmit={submitAdjustment} className="grid gap-3 md:grid-cols-2">
            <select className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={adjustment.productId} onChange={(event) => setAdjustment((current) => ({ ...current, productId: event.target.value }))}>
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={adjustment.quantity} onChange={(event) => setAdjustment((current) => ({ ...current, quantity: event.target.value }))} placeholder="Signed quantity" />
            <select className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={adjustment.reason} onChange={(event) => setAdjustment((current) => ({ ...current, reason: event.target.value as AdjustmentReason }))}>
              <option value="DAMAGED">Damaged</option>
              <option value="EXPIRED">Expired</option>
              <option value="COUNTED">Counted</option>
              <option value="OTHER">Other</option>
            </select>
            <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2" value={adjustment.note} onChange={(event) => setAdjustment((current) => ({ ...current, note: event.target.value }))} placeholder="Reason note" />
            <button className="rounded-2xl bg-gold-500 px-4 py-2 font-semibold text-slate-950 md:col-span-2">Save adjustment</button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Low stock queue" subtitle="Products already under threshold">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="font-medium text-amber-50">{product.name}</p>
              <p className="mt-1 text-sm text-amber-100/80">{product.category?.name}</p>
              <p className="mt-2 text-sm text-amber-100/90">Stock {product.stockQuantity} · Threshold {product.lowStockThreshold}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Movement history" subtitle="Receiving, sales, and adjustments">
        <div className="space-y-3">
          {movements.map((movement) => (
            <div key={movement.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{movement.product.name}</p>
                  <p className="text-sm text-slate-400">{movement.type} {movement.reason ? `· ${movement.reason}` : ''}</p>
                </div>
                <p className="text-sm text-slate-300">{formatDate(movement.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-300">Quantity {movement.quantity} · Supplier {movement.supplier?.name ?? 'N/A'}</p>
              {movement.note ? <p className="mt-1 text-sm text-slate-400">{movement.note}</p> : null}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
