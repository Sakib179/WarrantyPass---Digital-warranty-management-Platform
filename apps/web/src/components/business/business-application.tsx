'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BusinessApplicationDto } from '@warrantypass/shared';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  StatusBadge,
} from '@warrantypass/ui';
import { FileCheck2, FileLock2, Send, Trash2, Upload } from 'lucide-react';
import { useState, type ChangeEvent, type ReactNode } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { businessNavigation } from '@/components/business/business-navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { apiRequest, ApiClientError } from '@/lib/api-client';

export function BusinessApplication(): ReactNode {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<'TRADE_LICENSE' | 'BIN' | 'SUPPORTING'>('TRADE_LICENSE');
  const [progress, setProgress] = useState<string | null>(null);
  const application = useQuery({
    queryKey: ['business', 'application'],
    queryFn: () => apiRequest<BusinessApplicationDto>('/business/application'),
  });
  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['business', 'application'] });
  };
  const submit = useMutation({
    mutationFn: () => apiRequest('/business/application/submit', { method: 'POST' }),
    onSuccess: async () => {
      setProgress('Application submitted for secure review.');
      await refresh();
    },
    onError: (error) =>
      setProgress(error instanceof ApiClientError ? error.message : 'Submission failed.'),
  });
  const upload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('kind', kind);
    form.append('document', file);
    setProgress(`Uploading ${file.name}…`);
    try {
      await apiRequest('/business/application/documents', { method: 'POST', body: form });
      setProgress(`${file.name} uploaded privately.`);
      await refresh();
    } catch (error) {
      setProgress(error instanceof ApiClientError ? error.message : 'Upload failed.');
    } finally {
      event.target.value = '';
    }
  };

  const data = application.data;
  const editable = data?.status === 'DRAFT' || data?.status === 'MORE_INFORMATION_REQUIRED';
  return (
    <ProtectedRoute context="business">
      <DashboardShell
        title="Business verification"
        activeHref="/business/application"
        items={businessNavigation}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">Trust centre</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Business application</h1>
            <p className="mt-2 text-[var(--text-muted)]">
              Business files remain private and never appear on public profiles.
            </p>
          </div>
          {data ? <StatusBadge status={data.status} /> : null}
        </div>
        {application.isPending ? <p className="mt-8">Loading your secure application…</p> : null}
        {application.isError ? (
          <Alert className="mt-6" tone="danger" title="Application unavailable">
            Confirm that a business workspace is selected, then try again.
          </Alert>
        ) : null}
        {progress ? (
          <Alert className="mt-6" title="Application update">
            {progress}
          </Alert>
        ) : null}
        {data?.userVisibleReason ? (
          <Alert className="mt-6" tone="warning" title="Reviewer feedback">
            {data.userVisibleReason}
          </Alert>
        ) : null}
        {data ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            <Card>
              <CardHeader>
                <CardTitle>Application summary</CardTitle>
                <CardDescription>
                  Reference: {data.referenceNumber ?? 'Assigned after submission'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Legal name', data.legalName],
                  ['Display name', data.displayName],
                  ['Trade Licence', data.tradeLicenseNumber],
                  ['BIN', data.binNumber ?? 'Not provided'],
                  ['Email', data.businessEmail],
                  ['Phone', data.phone],
                  ['Location', `${data.area}, ${data.district}, ${data.division}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-0"
                  >
                    <span className="text-[var(--text-subtle)]">{label}</span>
                    <span className="text-right font-semibold">{value}</span>
                  </div>
                ))}
                <p className="flex items-center gap-2 pt-2 text-xs text-[var(--text-muted)]">
                  <FileLock2 aria-hidden="true" size={15} /> Identifiers are checked for duplicates
                  during review.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Verification documents</CardTitle>
                <CardDescription>PDF, JPEG, PNG, or WebP; maximum 10 MB per file.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {editable ? (
                  <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                    <select
                      value={kind}
                      onChange={(event) => setKind(event.target.value as typeof kind)}
                      aria-label="Document type"
                      className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                    >
                      <option value="TRADE_LICENSE">Trade licence</option>
                      <option value="BIN">BIN certificate</option>
                      <option value="SUPPORTING">Supporting file</option>
                    </select>
                    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 font-semibold text-white">
                      <Upload aria-hidden="true" size={17} /> Choose private file
                      <Input
                        className="sr-only"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(event) => void upload(event)}
                      />
                    </label>
                  </div>
                ) : null}
                {data.documents.length ? (
                  data.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] p-3"
                    >
                      <div>
                        <p className="font-semibold">{document.displayName}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {document.kind.replaceAll('_', ' ')} ·{' '}
                          {(document.sizeBytes / 1024).toFixed(1)} KB ·{' '}
                          {document.scanStatus.replaceAll('_', ' ')}
                        </p>
                      </div>
                      {editable ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${document.displayName}`}
                          onClick={() =>
                            void apiRequest(`/business/application/documents/${document.id}`, {
                              method: 'DELETE',
                            }).then(refresh)
                          }
                        >
                          <Trash2 aria-hidden="true" size={16} />
                        </Button>
                      ) : (
                        <FileCheck2 aria-hidden="true" className="text-[var(--success)]" />
                      )}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No documents uploaded"
                    description="A safe trade licence document is required before submission."
                    icon={<FileLock2 aria-hidden="true" />}
                  />
                )}
                {editable ? (
                  <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
                    <Send aria-hidden="true" size={17} />{' '}
                    {submit.isPending ? 'Submitting…' : 'Submit for review'}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DashboardShell>
    </ProtectedRoute>
  );
}
