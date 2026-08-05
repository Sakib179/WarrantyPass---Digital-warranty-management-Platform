'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Select } from '@warrantypass/ui';
import { apiRequest, setActiveBusinessId } from '../../../../../lib/api-client.js';

export default function NewServiceCenterPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const router = useRouter();

  useEffect(() => {
    setActiveBusinessId(businessId);
  }, [businessId]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    serviceCenterCode: '',
    phone: '',
    email: '',
    addressLine: '',
    area: '',
    district: '',
    division: 'Dhaka',
    postalCode: '',
    openingHours: 'Sat - Thu: 9:00 AM - 7:00 PM',
    serviceInstructions: '',
    status: 'ACTIVE',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiRequest('/business/service-centers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      router.push(`/business/${businessId}/service-centers`);
    } catch (err: any) {
      setError(err.message || 'Failed to create service center');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create Authorized Service Center</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Add an official service center location for receiving claims and performing warranty repairs.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Service Center Name *</label>
              <Input
                required
                placeholder="e.g. Uttara Express Repair Hub"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Unique Center Code *</label>
              <Input
                required
                placeholder="e.g. SC-DHK-001"
                value={formData.serviceCenterCode}
                onChange={(e) => setFormData({ ...formData, serviceCenterCode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Contact Phone *</label>
              <Input
                required
                placeholder="+8801700000000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email (Optional)</label>
              <Input
                type="email"
                placeholder="service.uttara@merchant.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Address Line *</label>
            <Input
              required
              placeholder="e.g. House 45, Road 11, Sector 4"
              value={formData.addressLine}
              onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Area *</label>
              <Input
                required
                placeholder="Uttara"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">District *</label>
              <Input
                required
                placeholder="Dhaka"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Division *</label>
              <Select
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              >
                <option value="Dhaka">Dhaka</option>
                <option value="Chattogram">Chattogram</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Khulna">Khulna</option>
                <option value="Barishal">Barishal</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rangpur">Rangpur</option>
                <option value="Mymensingh">Mymensingh</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Opening Hours *</label>
            <Input
              required
              value={formData.openingHours}
              onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Customer Drop-off / Service Instructions</label>
            <textarea
              rows={3}
              placeholder="Instructions for customers when dropping off products..."
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={formData.serviceInstructions}
              onChange={(e) => setFormData({ ...formData, serviceInstructions: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-4 border-t pt-4 border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Creating Center...' : 'Save Service Center'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
