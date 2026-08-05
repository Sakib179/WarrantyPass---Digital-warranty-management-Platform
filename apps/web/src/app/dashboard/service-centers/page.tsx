'use client';

import { useEffect, useState } from 'react';
import type { ServiceCenterDto } from '@warrantypass/shared';
import { Button, Card, Input, Select, Badge } from '@warrantypass/ui';
import { apiRequest } from '../../../lib/api-client.js';

export default function CustomerServiceCentersPage() {
  const [centers, setCenters] = useState<ServiceCenterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');

  const fetchCenters = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(division ? { division } : {}),
        ...(district ? { district } : {}),
      });
      const data = await apiRequest<ServiceCenterDto[]>(`/customer/service-centers?${query.toString()}`);
      setCenters(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load service centers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, [division, district]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCenters();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Authorized Service Center Finder</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Find official merchant-authorized service centers for product repairs, diagnostics, and claim servicing across Bangladesh.
        </p>
      </div>

      <Card className="mb-6 p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by center name or merchant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="sm:max-w-xs"
          >
            <option value="">All Divisions</option>
            <option value="Dhaka">Dhaka</option>
            <option value="Chattogram">Chattogram</option>
            <option value="Rajshahi">Rajshahi</option>
            <option value="Khulna">Khulna</option>
            <option value="Barishal">Barishal</option>
            <option value="Sylhet">Sylhet</option>
            <option value="Rangpur">Rangpur</option>
            <option value="Mymensingh">Mymensingh</option>
          </Select>
          <Input
            placeholder="Filter by District (e.g. Uttara)"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button type="submit" variant="primary">
            Search Centers
          </Button>
        </form>
      </Card>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Searching authorized service centers...</div>
      ) : centers.length === 0 ? (
        <Card className="py-12 text-center text-slate-500">
          No authorized service centers match the selected criteria.
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {centers.map((c) => (
            <Card key={c.id} className="flex flex-col justify-between p-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {c.serviceCenterCode}
                  </span>
                  <Badge tone="success">Verified Authorized</Badge>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{c.name}</h3>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">
                  Merchant: {c.businessName}
                </p>

                <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="font-semibold block text-slate-500">Address</span>
                    {c.addressLine}, {c.area}, {c.district}, {c.division}
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Contact Phone</span>
                    {c.phone}
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">Opening Hours</span>
                    {c.openingHours}
                  </div>
                  {c.serviceInstructions && (
                    <div className="mt-2 rounded bg-slate-50 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {c.serviceInstructions}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t pt-4 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {c.latitude && c.longitude ? `📍 ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : '📍 Location Verified'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
