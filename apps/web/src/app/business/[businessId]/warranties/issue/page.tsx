'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductDto, WarrantyTemplateDto } from '@warrantypass/shared';
import { Button, Card, Input, Select } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../../lib/api-client.js';

export default function IssueWarrantyPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const router = useRouter();

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [products, setProducts] = useState<ProductDto[]>([]);
  const [templates, setTemplates] = useState<WarrantyTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerEmail: '',
    customerName: '',
    customerPhone: '',
    productId: '',
    templateId: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    durationValue: '12',
    durationUnit: 'MONTHS',
    coverageType: 'MANUFACTURER',
    termsSummary: '',
    invoiceNumber: '',
    sellerName: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [prods, tpls] = await Promise.all([
          apiRequest<ProductDto[]>('/business/products'),
          apiRequest<WarrantyTemplateDto[]>('/business/warranty-templates'),
        ]);
        setProducts(prods);
        setTemplates(tpls);
        if (prods.length > 0) {
          const first = prods[0];
          setFormData((prev) => ({
            ...prev,
            productId: first?.id ?? '',
            durationValue: String(first?.defaultWarrantyDuration ?? 12),
            durationUnit: first?.defaultWarrantyDurationUnit ?? 'MONTHS',
            coverageType: first?.defaultCoverageType ?? 'MANUFACTURER',
          }));
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load products/templates');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [businessId]);

  const handleProductChange = (productId: string) => {
    const selectedProd = products.find((p) => p.id === productId);
    setFormData((prev) => ({
      ...prev,
      productId,
      ...(selectedProd?.defaultWarrantyDuration ? { durationValue: String(selectedProd.defaultWarrantyDuration) } : {}),
      ...(selectedProd?.defaultWarrantyDurationUnit ? { durationUnit: selectedProd.defaultWarrantyDurationUnit } : {}),
      ...(selectedProd?.defaultCoverageType ? { coverageType: selectedProd.defaultCoverageType } : {}),
    }));
  };

  const handleTemplateChange = (templateId: string) => {
    const selectedTpl = templates.find((t) => t.id === templateId);
    if (selectedTpl) {
      setFormData((prev) => ({
        ...prev,
        templateId,
        durationValue: String(selectedTpl.durationValue),
        durationUnit: selectedTpl.durationUnit,
        coverageType: selectedTpl.coverageType,
        termsSummary: selectedTpl.termsSummary,
      }));
    } else {
      setFormData((prev) => ({ ...prev, templateId: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        customerEmail: formData.customerEmail,
        customerName: formData.customerName || null,
        customerPhone: formData.customerPhone || null,
        productId: formData.productId,
        templateId: formData.templateId || null,
        serialNumber: formData.serialNumber,
        purchaseDate: formData.purchaseDate,
        startDate: formData.startDate,
        durationValue: Number(formData.durationValue),
        durationUnit: formData.durationUnit,
        coverageType: formData.coverageType,
        termsSummary: formData.termsSummary || 'Standard Manufacturer Digital Warranty Coverage',
        invoiceNumber: formData.invoiceNumber || null,
        sellerName: formData.sellerName || null,
      };

      await apiRequest('/business/warranties', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/business/${businessId}/warranties`);
    } catch (err: any) {
      setError(err.message || 'Failed to issue warranty');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Loading issuance form...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Issue Verified Digital Warranty</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Issue an authentic business warranty directly to a customer account or email recipient.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b pb-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">1. Customer Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Customer Email *</label>
                <Input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Customer Name</label>
                <Input
                  placeholder="Full Name"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone Number</label>
                <Input
                  placeholder="+8801700000000"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">2. Product & Serial Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Select Business Product *</label>
                <Select value={formData.productId} onChange={(e) => handleProductChange(e.target.value)}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.modelNumber ? `(${p.modelNumber})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Serial Number *</label>
                <Input
                  required
                  placeholder="e.g. SN-WALTON-892341"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">3. Warranty Coverage & Terms</h2>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Apply Preset Template (Optional)</label>
              <Select value={formData.templateId} onChange={(e) => handleTemplateChange(e.target.value)}>
                <option value="">No Template (Manual terms)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.durationValue} {t.durationUnit})
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Purchase Date *</label>
                <Input
                  type="date"
                  required
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>
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
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">Terms & Exclusions Summary</label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                value={formData.termsSummary}
                onChange={(e) => setFormData({ ...formData, termsSummary: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Issuing Digital Warranty...' : 'Issue Verified Warranty'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
