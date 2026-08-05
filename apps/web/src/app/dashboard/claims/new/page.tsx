'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Input, Select } from '@warrantypass/ui';
import { apiRequest } from '../../../../lib/api-client.js';

interface EligibleWarranty {
  id: string;
  warrantyNumber: string;
  productName: string;
  businessName: string;
  source: string;
  status: string;
  endDate: string;
}

export default function SubmitClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedWarrantyId = searchParams.get('warrantyId');

  const [warranties, setWarranties] = useState<EligibleWarranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    warrantyId: preselectedWarrantyId || '',
    subject: '',
    description: '',
    problemStartDate: new Date().toISOString().split('T')[0],
    productCondition: '',
    preferredContactMethod: 'EMAIL',
    customerPhone: '',
    preferredServiceLocation: '',
  });

  useEffect(() => {
    async function loadWarranties() {
      try {
        const data = await apiRequest<any[]>('/customer/warranties');
        // Filter only business-issued active warranties
        const eligible = data
          .filter((w) => w.source === 'BUSINESS_ISSUED' && w.status === 'ACTIVE')
          .map((w) => ({
            id: w.id,
            warrantyNumber: w.warrantyNumber,
            productName: w.catalogProduct?.name || w.customerProduct?.productName || 'Verified Product',
            businessName: w.issuerBusiness?.name || 'Verified Issuer',
            source: w.source,
            status: w.status,
            endDate: w.endDate,
          }));
        setWarranties(eligible);
        if (eligible.length > 0 && !formData.warrantyId) {
          const first = eligible[0];
          setFormData((prev) => ({ ...prev, warrantyId: first?.id ?? '' }));
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load eligible warranties');
      } finally {
        setLoading(false);
      }
    }
    loadWarranties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        warrantyId: formData.warrantyId,
        subject: formData.subject,
        description: formData.description,
        problemStartDate: formData.problemStartDate,
        productCondition: formData.productCondition || null,
        preferredContactMethod: formData.preferredContactMethod || null,
        customerPhone: formData.customerPhone || null,
        preferredServiceLocation: formData.preferredServiceLocation || null,
      };

      const res = await apiRequest<any>('/customer/claims', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/dashboard/claims/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Loading claim submission form...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Submit Digital Warranty Claim</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          File an official claim for your verified business warranty.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {warranties.length === 0 ? (
        <Card className="py-12 text-center p-6 text-slate-500">
          <p className="mb-4">
            You do not currently have any active business-issued warranties eligible for submitting claims.
          </p>
          <p className="text-xs text-slate-400">
            Claims can only be filed against business-verified digital warranties issued directly to your account.
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-medium">Select Verified Warranty *</label>
              <Select
                value={formData.warrantyId}
                onChange={(e) => setFormData({ ...formData, warrantyId: e.target.value })}
              >
                {warranties.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.productName} ({w.warrantyNumber}) &mdash; {w.businessName}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Problem Summary / Title *</label>
              <Input
                required
                placeholder="e.g. Screen flickering / Battery not charging"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Detailed Issue Description *</label>
              <textarea
                required
                rows={4}
                placeholder="Describe what happened, error codes, steps to reproduce, or damage details..."
                className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Date Problem Started</label>
                <Input
                  type="date"
                  value={formData.problemStartDate}
                  onChange={(e) => setFormData({ ...formData, problemStartDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Current Physical Condition</label>
                <Input
                  placeholder="e.g. Minor scratches, intact seal, no liquid exposure"
                  value={formData.productCondition}
                  onChange={(e) => setFormData({ ...formData, productCondition: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Preferred Contact Method</label>
                <Select
                  value={formData.preferredContactMethod}
                  onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </Select>
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

            <div className="flex justify-end gap-4 border-t pt-4 border-slate-100 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Submitting Claim...' : 'Submit Claim'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
