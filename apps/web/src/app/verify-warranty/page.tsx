'use client';

import { useState } from 'react';
import { Button, Card, Input, Badge } from '@warrantypass/ui';
import { apiRequest } from '../../lib/api-client.js';

interface PublicVerificationResult {
  verified: boolean;
  warrantyNumber: string;
  verificationCodeProvided: boolean;
  serialNumberMasked: string | null;
  status: string | null;
  verificationLabel: string;
  isUserUploaded: boolean;
  issuingBusinessName: string | null;
  productBrand: string | null;
  productModel: string | null;
  startDate: string | null;
  endDate: string | null;
  revoked: boolean;
  revocationReason?: string | null;
  disclaimer: string;
}

export default function PublicVerifyWarrantyPage() {
  const [warrantyNumber, setWarrantyNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantyNumber.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiRequest<PublicVerificationResult>('/public/warranty-verification', {
        method: 'POST',
        body: JSON.stringify({
          warrantyNumber: warrantyNumber.trim(),
          ...(verificationCode ? { verificationCode: verificationCode.trim() } : {}),
          ...(serialNumber ? { serialNumber: serialNumber.trim() } : {}),
        }),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to verify warranty record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl">
          Digital Warranty Authenticity Verification
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Verify official merchant-issued digital warranties registered on WarrantyPass. Check validity, merchant issuer status, and coverage window.
        </p>
      </div>

      <Card className="p-6 mb-8 shadow-sm">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Warranty Number *</label>
            <Input
              required
              placeholder="e.g. WP-2026-89472"
              value={warrantyNumber}
              onChange={(e) => setWarrantyNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Verification Code (Optional)</label>
              <Input
                placeholder="e.g. SEC-4892"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Serial Number (Optional)</label>
              <Input
                placeholder="e.g. SN-WAL89410"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Verifying Registry...' : 'Verify Authenticity'}
          </Button>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <Card className="p-6 border-2 border-slate-200 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {result.warrantyNumber}
                </h2>
                {result.verified ? (
                  <Badge tone="success">Verified Authentic</Badge>
                ) : result.isUserUploaded ? (
                  <Badge tone="warning">User Uploaded Record</Badge>
                ) : result.revoked ? (
                  <Badge tone="danger">Revoked</Badge>
                ) : (
                  <Badge tone="neutral">Unverified</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{result.disclaimer}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Issuing Business</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {result.issuingBusinessName || 'N/A (User Vault)'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block">Brand & Model</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {result.productBrand || 'Generic'} {result.productModel ? `(${result.productModel})` : ''}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block">Serial Number</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {result.serialNumberMasked || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block">Warranty Period</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {result.startDate ? new Date(result.startDate).toLocaleDateString() : 'N/A'} &mdash;{' '}
                {result.endDate ? new Date(result.endDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          {result.revoked && (
            <div className="rounded-md bg-red-50 p-4 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
              <span className="font-bold">Warning:</span> This warranty was revoked by the issuer. Reason: {result.revocationReason || 'N/A'}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
