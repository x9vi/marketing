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
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
    await refresh();
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
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-400">Catalog</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Product management</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Categories" subtitle="Manage product groups" action={<span className="text-sm text-slate-400">{categories.length} total</span>}>
          <form onSubmit={submitCategory} className="grid gap-3 sm:grid-cols-3">
            <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" />
            <input className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm" value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} placeholder="category-slug" />
            <button className="rounded-2xl bg-gold-500 px-4 py-2 text-sm font-semibold text-slate-950">Add category</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.id} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm text-slate-200">
                {category.name}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={editingId ? 'Edit product' : 'Add product'} subtitle="Fields match the POS and inventory modules">
          <form onSubmit={submitProduct} className="grid gap-3 sm:grid-cols-2">
            {[
              ['name', 'Name'],
              ['sku', 'SKU'],
              ['barcode', 'Barcode'],
              ['price', 'Price'],
              ['costPrice', 'Cost price'],
              ['stockQuantity', 'Stock quantity'],
              ['lowStockThreshold', 'Low stock threshold'],
              ['imageUrl', 'Image URL (optional)']
            ].map(([key, label]) => (
              <label key={key} className="text-sm text-slate-300">
                {label}
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={(form as Record<string, string | boolean>)[key] as string}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={label}
                />
              </label>
            ))}
            <label className="text-sm text-slate-300">
              Category
              <select className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm" value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Unit
              <select className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm" value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value as Unit }))}>
                <option value="PIECE">Piece</option>
                <option value="KG">Kg</option>
                <option value="LITER">Liter</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Image file
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm" type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.expiryTracked} onChange={(event) => setForm((current) => ({ ...current, expiryTracked: event.target.checked }))} />
              Track expiry
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Active
            </label>
            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button className="rounded-2xl bg-gold-500 px-4 py-2 font-semibold text-slate-950">{editingId ? 'Update product' : 'Create product'}</button>
              {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-200">Cancel</button> : null}
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Products" subtitle="Edit, delete, and monitor low stock items">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-3 pr-4">Product</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Price</th>
                <th className="py-3 pr-4">Stock</th>
                <th className="py-3 pr-4">Threshold</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-white/10 text-slate-200">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white">{product.name}</div>
                    <div className="text-xs text-slate-400">{product.sku}</div>
                  </td>
                  <td className="py-3 pr-4">{product.category?.name}</td>
                  <td className="py-3 pr-4">{formatCurrency(product.price)}</td>
                  <td className="py-3 pr-4">{product.stockQuantity}</td>
                  <td className="py-3 pr-4">{product.lowStockThreshold}</td>
                  <td className="py-3 pr-4">{product.stockQuantity <= product.lowStockThreshold ? <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs text-amber-100">Low</span> : <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-100">OK</span>}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button onClick={() => editProduct(product)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">Edit</button>
                      <button onClick={() => void removeProduct(product.id)} className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
