'use client';

import { use, useEffect, useState } from 'react';
import type { ProductDto, WarrantyTemplateDto } from '@warrantypass/shared';
import { Button, Card, Input, Select, Badge, Dialog } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../lib/api-client.js';

export default function WarrantyTemplatesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [templates, setTemplates] = useState<WarrantyTemplateDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WarrantyTemplateDto | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    productId: '',
    durationValue: '12',
    durationUnit: 'MONTHS',
    coverageType: 'MANUFACTURER',
    termsSummary: '',
    exclusions: '',
    serviceInstructions: '',
    status: 'ACTIVE',
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<WarrantyTemplateDto[]>('/business/warranty-templates');
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load warranty templates');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiRequest<ProductDto[]>('/business/products');
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTemplates();
  }, [businessId]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      productId: '',
      durationValue: '12',
      durationUnit: 'MONTHS',
      coverageType: 'MANUFACTURER',
      termsSummary: 'Standard 1-year manufacturer warranty covering internal hardware defects.',
      exclusions: 'Physical damage, liquid damage, unauthorized repairs.',
      serviceInstructions: 'Bring device with proof of purchase to any authorized service center.',
      status: 'ACTIVE',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: WarrantyTemplateDto) => {
    setEditingTemplate(t);
    setFormData({
      name: t.name,
      productId: t.productId ?? '',
      durationValue: String(t.durationValue),
      durationUnit: t.durationUnit,
      coverageType: t.coverageType,
      termsSummary: t.termsSummary,
      exclusions: t.exclusions ?? '',
      serviceInstructions: t.serviceInstructions ?? '',
      status: t.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name,
        productId: formData.productId || null,
        durationValue: Number(formData.durationValue),
        durationUnit: formData.durationUnit,
        coverageType: formData.coverageType,
        termsSummary: formData.termsSummary,
        exclusions: formData.exclusions || null,
        serviceInstructions: formData.serviceInstructions || null,
        status: formData.status,
      };

      if (editingTemplate) {
        await apiRequest(`/business/warranty-templates/${editingTemplate.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/business/warranty-templates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save template');
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Warranty Templates</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Define reusable warranty terms, durations, and exclusions for quick issuance.
          </p>
        </div>
        <Button onClick={openCreateModal} variant="primary">
          + Create Warranty Template
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-slate-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          No templates created yet. Create a template to standardize your business warranties.
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col justify-between p-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Badge tone={tpl.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {tpl.status} (v{tpl.version})
                  </Badge>
                  <span className="text-xs text-slate-500">{tpl.coverageType}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{tpl.name}</h3>
                <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {tpl.durationValue} {tpl.durationUnit} Coverage
                </p>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {tpl.termsSummary}
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
                <Button variant="secondary" size="sm" onClick={() => openEditModal(tpl)}>
                  Edit / Version
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? `Edit Template (v${editingTemplate.version})` : 'Create Warranty Template'}
      >
        <form onSubmit={handleSave} className="space-y-4 py-2">
          {formError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
              {formError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Template Name *</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Standard Electronics 1-Year Warranty"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Link to Product (Optional)</label>
            <Select
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            >
              <option value="">All Business Products (Generic)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.modelNumber ? `(${p.modelNumber})` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Duration Value *</label>
              <Input
                type="number"
                required
                value={formData.durationValue}
                onChange={(e) => setFormData({ ...formData, durationValue: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Unit *</label>
              <Select
                value={formData.durationUnit}
                onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
              >
                <option value="DAYS">Days</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Terms Summary *</label>
            <textarea
              required
              rows={3}
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={formData.termsSummary}
              onChange={(e) => setFormData({ ...formData, termsSummary: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Exclusions</label>
            <textarea
              rows={2}
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={formData.exclusions}
              onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={formSaving}>
              {formSaving ? 'Saving...' : editingTemplate ? 'Save (Bump Version)' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
