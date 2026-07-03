import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client.js';
import type { Category, Product, Unit } from '../api/types.js';
import { SectionCard } from '../components/SectionCard.js';
import { formatCurrency } from '../lib/format.js';

const emptyForm = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  price: '',
  costPrice: '',
  stockQuantity: '0',
  lowStockThreshold: '10',
  unit: 'PIECE' as Unit,
  expiryTracked: false,
  active: true,
  imageUrl: ''
};

export function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const refresh = async () => {
    const [categoriesResult, productsResult] = await Promise.all([
      apiFetch<{ categories: Category[] }>('/categories'),
      apiFetch<{ products: Product[] }>('/products')
    ]);
    setCategories(categoriesResult.categories);
    setProducts(productsResult.products);
    if (!form.categoryId && categoriesResult.categories[0]) {
      setForm((current) => ({ ...current, categoryId: categoriesResult.categories[0].id }));
    }
  };

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  const submitCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: categoryName, slug: categorySlug })
    });
    setCategoryName('');
    setCategorySlug('');
    await refresh();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (e: any) {
      alert(`Failed to delete category: ${e.message}`);
    }
  };

  const submitProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, String(value)));
    if (imageFile) payload.append('image', imageFile);

    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/products/${editingId}` : '/products';

    await apiFetch(endpoint, {
      method,
      body: payload
    });

    setForm(emptyForm);
    setImageFile(null);
    setEditingId(null);
    await refresh();
  };

  const removeProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (e: any) {
      alert(`Failed to delete product: ${e.message}`);
    }
  };

  const editProduct = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? '',
      categoryId: product.categoryId,
      price: String(product.price),
      costPrice: String(product.costPrice),
      stockQuantity: String(product.stockQuantity),
      lowStockThreshold: String(product.lowStockThreshold),
      unit: product.unit,
      expiryTracked: product.expiryTracked,
      active: product.active,
      imageUrl: product.imageUrl ?? ''
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-gold-400">Catalog Management</p>
          <h1 className="mt-1 text-2xl font-bold text-white tracking-tight">Product Management</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {products.length} products · {categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingId(null); setForm(emptyForm); setImageFile(null); }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            ✕ Clear form
          </button>
          <button
            onClick={() => void refresh().catch(() => undefined)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Main 2-column layout: Form (left) | Product List (right) ── */}
      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">

        {/* ── ADD / EDIT PRODUCT FORM ── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div>
              <h2 className="text-sm font-bold text-white">{editingId ? '✏️ Edit Product' : '➕ Add Product'}</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Changes sync to POS automatically</p>
            </div>
            {editingId && (
              <span className="text-[9px] font-black uppercase tracking-widest text-gold-400 bg-gold-500/10 border border-gold-500/20 px-2 py-1 rounded-md">
                EDITING
              </span>
            )}
          </div>

          <form onSubmit={(e) => void submitProduct(e)} className="p-5 space-y-4">

            {/* Image Preview */}
            {(form.imageUrl || imageFile) && (
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-white/10 h-36 flex items-center justify-center">
                <img
                  src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Name */}
              <label className="col-span-2 text-xs text-slate-400 font-semibold">
                Product Name *
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  placeholder="e.g. Organic Milk 1L"
                  required
                />
              </label>

              {/* SKU */}
              <label className="text-xs text-slate-400 font-semibold">
                SKU
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.sku}
                  onChange={(e) => setForm((c) => ({ ...c, sku: e.target.value }))}
                  placeholder="PROD-001"
                />
              </label>

              {/* Barcode */}
              <label className="text-xs text-slate-400 font-semibold">
                Barcode
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.barcode}
                  onChange={(e) => setForm((c) => ({ ...c, barcode: e.target.value }))}
                  placeholder="6009001234567"
                />
              </label>

              {/* Selling Price */}
              <label className="text-xs text-slate-400 font-semibold">
                Selling Price (IQD) *
                <input
                  type="number"
                  step="1"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.price}
                  onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
                  placeholder="0"
                  required
                />
              </label>

              {/* Cost Price */}
              <label className="text-xs text-slate-400 font-semibold">
                Cost Price (IQD)
                <input
                  type="number"
                  step="1"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.costPrice}
                  onChange={(e) => setForm((c) => ({ ...c, costPrice: e.target.value }))}
                  placeholder="0"
                />
              </label>

              {/* Stock */}
              <label className="text-xs text-slate-400 font-semibold">
                Stock Qty
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.stockQuantity}
                  onChange={(e) => setForm((c) => ({ ...c, stockQuantity: e.target.value }))}
                />
              </label>

              {/* Low Stock Threshold */}
              <label className="text-xs text-slate-400 font-semibold">
                Low Stock Alert
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm((c) => ({ ...c, lowStockThreshold: e.target.value }))}
                />
              </label>

              {/* Category */}
              <label className="text-xs text-slate-400 font-semibold">
                Category *
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.categoryId}
                  onChange={(e) => setForm((c) => ({ ...c, categoryId: e.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </label>

              {/* Unit */}
              <label className="text-xs text-slate-400 font-semibold">
                Unit
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.unit}
                  onChange={(e) => setForm((c) => ({ ...c, unit: e.target.value as Unit }))}
                >
                  <option value="PIECE">Piece</option>
                  <option value="KG">Kilogram (kg)</option>
                  <option value="LITER">Liter (L)</option>
                </select>
              </label>

              {/* Image File Upload */}
              <label className="col-span-2 text-xs text-slate-400 font-semibold">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-gold-500 file:text-slate-950 file:font-semibold file:text-xs cursor-pointer"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {/* Image URL */}
              <label className="col-span-2 text-xs text-slate-400 font-semibold">
                Image URL (optional)
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
                  value={form.imageUrl}
                  onChange={(e) => setForm((c) => ({ ...c, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </label>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  onClick={() => setForm((c) => ({ ...c, active: !c.active }))}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-xs font-semibold text-slate-300">Active in POS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.expiryTracked}
                  onChange={(e) => setForm((c) => ({ ...c, expiryTracked: e.target.checked }))}
                  className="w-4 h-4 rounded accent-gold-500"
                />
                <span className="text-xs font-semibold text-slate-300">Track expiry</span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gold-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-gold-400 transition-colors shadow-[0_4px_14px_rgba(232,184,79,0.3)]"
              >
                {editingId ? '✓ Update Product' : '+ Create Product'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm(emptyForm); setImageFile(null); }}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── PRODUCT TABLE ── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div>
              <h2 className="text-sm font-bold text-white">🗂️ Product Catalog</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Click Edit to modify a product</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-800 border border-white/10 px-2 py-1 rounded-lg font-mono">
              {products.length} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Product</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Category</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Price</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">Stock</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">Status</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, idx) => {
                  const isLow = product.stockQuantity <= product.lowStockThreshold;

                  return (
                    <tr
                      key={product.id}
                      className="border-b transition-colors hover:bg-white/[0.02]"
                      style={{ borderColor: 'rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                    >
                      {/* Product name + image */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-9 w-9 rounded-lg object-cover border border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 text-lg">
                              📦
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white leading-tight">{product.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{product.sku}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-slate-800 border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                          {product.category?.name}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-gold-400 font-mono">{formatCurrency(product.price)}</span>
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 text-center">
                        <span className={`font-mono font-bold text-xs ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {product.stockQuantity}
                        </span>
                        {isLow && (
                          <div className="text-[9px] text-amber-500/70 font-semibold">LOW</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          product.active
                            ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                            : 'bg-slate-800 border border-white/10 text-slate-500'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${product.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          {product.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => editProduct(product)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => void removeProduct(product.id)}
                            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/15 transition-colors"
                          >
                            🗑️ Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-4xl mb-3">📦</p>
                <p className="text-sm font-semibold text-slate-500">No products yet. Add one using the form.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CATEGORIES SECTION ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/70 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="text-sm font-bold text-white">🏷️ Categories</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Organize your product catalog</p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 font-mono">{categories.length} categories</span>
        </div>
        <div className="p-5 space-y-4">
          <form onSubmit={(e) => void submitCategory(e)} className="flex gap-3">
            <input
              className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Category name (e.g. Dairy)"
              required
            />
            <input
              className="w-40 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-gold-400 transition-colors"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              placeholder="dairy"
            />
            <button className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-gold-400 transition-colors">
              + Add
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span key={cat.id} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-800 pl-3 pr-1.5 py-1.5 text-xs font-semibold text-slate-200">
                🏷️ {cat.name}
                <span className="text-[9px] text-slate-500 font-mono">({cat.slug})</span>
                <button
                  type="button"
                  onClick={() => void deleteCategory(cat.id)}
                  className="ml-1 flex h-4 w-4 items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors"
                  title="Delete category"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
