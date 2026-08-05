'use client';

import { use, useEffect, useState } from 'react';
import type { ProductDto } from '@warrantypass/shared';
import { Button, Card, Input, Select, Badge, Dialog } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function BusinessProductsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    brandId: '',
    modelNumber: '',
    sku: '',
    description: '',
    defaultWarrantyDuration: '12',
    defaultWarrantyDurationUnit: 'MONTHS',
    defaultCoverageType: 'MANUFACTURER',
    status: 'ACTIVE',
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ProductDto[]>(`/business/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [cats, brs] = await Promise.all([
        apiRequest<Array<{ id: string; name: string }>>('/products/categories'),
        apiRequest<Array<{ id: string; name: string }>>('/products/brands'),
      ]);
      setCategories(cats);
      setBrands(brs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchProducts();
  }, [businessId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id ?? '',
      brandId: '',
      modelNumber: '',
      sku: '',
      description: '',
      defaultWarrantyDuration: '12',
      defaultWarrantyDurationUnit: 'MONTHS',
      defaultCoverageType: 'MANUFACTURER',
      status: 'ACTIVE',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductDto) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      categoryId: p.categoryId,
      brandId: p.brandId ?? '',
      modelNumber: p.modelNumber ?? '',
      sku: p.sku ?? '',
      description: p.description ?? '',
      defaultWarrantyDuration: String(p.defaultWarrantyDuration ?? 12),
      defaultWarrantyDurationUnit: p.defaultWarrantyDurationUnit ?? 'MONTHS',
      defaultCoverageType: p.defaultCoverageType ?? 'MANUFACTURER',
      status: p.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name,
        categoryId: formData.categoryId,
        brandId: formData.brandId || null,
        modelNumber: formData.modelNumber || null,
        sku: formData.sku || null,
        description: formData.description || null,
        defaultWarrantyDuration: formData.defaultWarrantyDuration ? Number(formData.defaultWarrantyDuration) : null,
        defaultWarrantyDurationUnit: formData.defaultWarrantyDurationUnit,
        defaultCoverageType: formData.defaultCoverageType,
        status: formData.status,
      };

      if (editingProduct) {
        await apiRequest(`/business/products/${editingProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/business/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setFormSaving(false);
    }
  };

  const handleArchive = async (productId: string) => {
    if (!confirm('Are you sure you want to archive this product?')) return;
    try {
      await apiRequest(`/business/products/${productId}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to archive product');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Business Product Catalog</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your models, default warranty coverage, and SKUs for verified issuance.
          </p>
        </div>
        <Button onClick={openCreateModal} variant="primary">
          + Add New Product
        </Button>
      </div>

      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <Input
            placeholder="Search products by name, model number, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-slate-500">Loading products...</div>
      ) : products.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          No products found. Click &quot;Add New Product&quot; to build your catalog.
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col justify-between p-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Badge tone={product.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {product.status}
                  </Badge>
                  <span className="text-xs text-slate-500">{product.categoryName ?? 'General'}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{product.name}</h3>
                {product.modelNumber && (
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Model: {product.modelNumber}
                  </p>
                )}
                {product.sku && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">SKU: {product.sku}</p>
                )}
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Default Warranty: {product.defaultWarrantyDuration ?? 12} {product.defaultWarrantyDurationUnit ?? 'MONTHS'} ({product.defaultCoverageType ?? 'MANUFACTURER'})
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                <Button variant="secondary" size="sm" onClick={() => openEditModal(product)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleArchive(product.id)}>
                  Archive
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 py-2">
          {formError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
              {formError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Product Name *</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Walton Primo S8 Max"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Category *</label>
              <Select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Brand</label>
              <Select
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Model Number</label>
              <Input
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                placeholder="e.g. W-PS8M-128"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">SKU</label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. SKU-984321"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Default Duration</label>
              <Input
                type="number"
                value={formData.defaultWarrantyDuration}
                onChange={(e) => setFormData({ ...formData, defaultWarrantyDuration: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Unit</label>
              <Select
                value={formData.defaultWarrantyDurationUnit}
                onChange={(e) => setFormData({ ...formData, defaultWarrantyDurationUnit: e.target.value })}
              >
                <option value="DAYS">Days</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={formSaving}>
              {formSaving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
