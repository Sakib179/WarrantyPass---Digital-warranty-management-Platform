'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Badge, Dialog } from '@warrantypass/ui';
import { apiRequest } from '../../../lib/api-client.js';

interface EligibleProduct {
  id: string;
  productName: string;
  brandName?: string;
  serialNumber?: string;
}

interface TransferItem {
  id: string;
  transferNumber: string;
  recipientEmail: string;
  status: string;
  createdAt: string;
  customerProduct: { productName: string; serialNumber: string | null };
  business: { name: string };
  sender?: { name: string };
}

export default function CustomerTransfersPage() {
  const [products, setProducts] = useState<EligibleProduct[]>([]);
  const [transfers, setTransfers] = useState<{ sent: TransferItem[]; received: TransferItem[] }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ sent: TransferItem[]; received: TransferItem[] }>('/customer/transfers');
      setTransfers(data);

      // Also load eligible customer products
      const prodData = await apiRequest<any[]>('/customer/warranties');
      const activeProducts = prodData
        .filter((w) => w.customerProduct)
        .map((w) => ({
          id: w.customerProduct.id,
          productName: w.customerProduct.productName,
          serialNumber: w.customerProduct.serialNumber,
        }));
      setProducts(activeProducts);
      if (activeProducts.length > 0 && !selectedProductId && activeProducts[0]) {
        setSelectedProductId(activeProducts[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/customer/transfers', {
        method: 'POST',
        body: JSON.stringify({
          customerProductId: selectedProductId,
          recipientEmail,
          note: transferNote,
        }),
      });
      setIsNewTransferOpen(false);
      setRecipientEmail('');
      setTransferNote('');
      fetchTransfers();
    } catch (err: any) {
      alert(err.message || 'Failed to initiate transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (transferId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      await apiRequest(`/customer/transfers/${transferId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      fetchTransfers();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to transfer request');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Warranty Ownership Transfer</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Transfer eligible active product warranties safely to another WarrantyPass user with merchant audit approval.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsNewTransferOpen(true)}>
          + Transfer Product
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading transfers...</div>
      ) : (
        <div className="space-y-8">
          {/* Pending Invitations Received */}
          {transfers.received.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Incoming Transfer Invitations ({transfers.received.length})
              </h2>
              <div className="space-y-3">
                {transfers.received.map((t) => (
                  <Card key={t.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-500">{t.transferNumber}</span>
                        <Badge tone="info">{t.status}</Badge>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                        {t.customerProduct.productName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        From: {t.sender?.name || 'Previous Owner'} &bull; Merchant: {t.business.name}
                      </p>
                    </div>

                    {t.status === 'PENDING_RECIPIENT' && (
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" onClick={() => handleRespond(t.id, 'REJECT')}>
                          Decline
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleRespond(t.id, 'ACCEPT')}>
                          Accept Transfer
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing Transfers Sent */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Transfers Initiated by You ({transfers.sent.length})
            </h2>
            {transfers.sent.length === 0 ? (
              <Card className="py-8 text-center text-slate-500">You have not initiated any product transfers.</Card>
            ) : (
              <div className="space-y-3">
                {transfers.sent.map((t) => (
                  <Card key={t.id} className="flex items-center justify-between p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-500">{t.transferNumber}</span>
                        <Badge tone={t.status === 'COMPLETED' ? 'success' : 'warning'}>{t.status}</Badge>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                        {t.customerProduct.productName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Recipient: {t.recipientEmail} &bull; Initiated {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Transfer Modal */}
      <Dialog open={isNewTransferOpen} onClose={() => setIsNewTransferOpen(false)} title="Initiate Warranty Ownership Transfer">
        <form onSubmit={handleInitiateTransfer} className="space-y-4 py-2">
          <p className="text-xs text-slate-500">
            Select a product from your wallet to transfer. The recipient will receive a secure single-use transfer invitation.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Select Product to Transfer *</label>
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productName} {p.serialNumber ? `(${p.serialNumber})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Recipient Email Address *</label>
            <Input
              required
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Message to Recipient (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Transferring warranty for laptop sold on marketplace"
              className="w-full rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsNewTransferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Sending Invitation...' : 'Send Transfer Invitation'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
