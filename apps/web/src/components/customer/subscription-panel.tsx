'use client';

import type { CustomerPaymentDto, CustomerSubscriptionDto } from '@warrantypass/shared';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@warrantypass/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ShieldCheck } from 'lucide-react';

import { apiRequest } from '@/lib/api-client';

export function SubscriptionPanel() {
  const client = useQueryClient();
  const subscription = useQuery({
    queryKey: ['customer-subscription'],
    queryFn: () => apiRequest<CustomerSubscriptionDto>('/customer/subscription'),
  });
  const payments = useQuery({
    queryKey: ['customer-payments'],
    queryFn: () => apiRequest<CustomerPaymentDto[]>('/customer/payments'),
  });
  const checkout = useMutation({
    mutationFn: () =>
      apiRequest<CustomerSubscriptionDto>('/customer/subscription/checkout', {
        method: 'POST',
        body: JSON.stringify({ planKey: 'manual-vault-annual' }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['customer-subscription'] });
      await client.invalidateQueries({ queryKey: ['customer-payments'] });
    },
  });
  const cancel = useMutation({
    mutationFn: () =>
      apiRequest<CustomerSubscriptionDto>('/customer/subscription/cancel', { method: 'POST' }),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['customer-subscription'] }),
  });
  if (subscription.isLoading) return <Skeleton className="mt-6 h-96" />;
  if (subscription.isError || !subscription.data)
    return (
      <div className="mt-6">
        <ErrorState
          title="Subscription unavailable"
          description="We could not retrieve your plan."
        />
      </div>
    );
  const data = subscription.data;
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{data.plan.name}</CardTitle>
            {data.subscription ? (
              <StatusBadge status={data.entitled ? 'ACTIVE' : 'EXPIRED'} />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            ৳{data.plan.amount}
            <span className="text-base font-medium text-[var(--text-muted)]"> / year</span>
          </p>
          <p className="mt-3 text-[var(--text-muted)]">{data.plan.description}</p>
          <ul className="mt-6 space-y-3">
            {[
              'Create and edit manual warranty records',
              'Upload private warranty cards and invoices',
              'Keep existing records readable after expiry',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <Check aria-hidden="true" className="text-[var(--success)]" />
                {item}
              </li>
            ))}
          </ul>
          {data.subscription ? (
            <div className="mt-6 rounded-xl bg-[var(--surface-muted)] p-4 text-sm">
              <p>
                Current period ends{' '}
                <strong>
                  {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('en-BD', {
                    timeZone: 'Asia/Dhaka',
                    dateStyle: 'long',
                  })}
                </strong>
                .
              </p>
              {data.subscription.cancelAtPeriodEnd ? (
                <p className="mt-2 text-[var(--warning-text)]">
                  Cancellation is scheduled for the period end.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-6">
            {data.entitled ? (
              <Button
                variant="secondary"
                disabled={cancel.isPending || data.subscription?.cancelAtPeriodEnd}
                onClick={() => cancel.mutate()}
              >
                Cancel at period end
              </Button>
            ) : (
              <Button disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                {checkout.isPending ? 'Activating mock plan…' : 'Start annual subscription'}
              </Button>
            )}
          </div>
          {checkout.isError || cancel.isError ? (
            <Alert className="mt-4" tone="danger" title="Subscription update failed">
              {(checkout.error ?? cancel.error)?.message}
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.data?.length ? (
            <ul className="divide-y divide-[var(--border)]">
              {payments.data.map((payment) => (
                <li key={payment.id} className="py-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        ৳{payment.amount} {payment.currency}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-subtle)]">
                        {payment.paymentReference}
                      </p>
                    </div>
                    <StatusBadge
                      status={
                        payment.status === 'SUCCEEDED'
                          ? 'COMPLETED'
                          : payment.status === 'PENDING'
                            ? 'PENDING'
                            : 'REJECTED'
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 text-center">
              <ShieldCheck aria-hidden="true" className="mx-auto text-[var(--text-subtle)]" />
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                No payments recorded yet. WarrantyPass never stores raw card or mobile-banking
                credentials.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
