import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export interface CheckoutResult {
  paymentReference: string;
  providerPaymentId: string;
  status: 'SUCCEEDED';
}

export interface BillingProvider {
  readonly name: string;
  checkout(input: { userId: string; amount: string; currency: string }): Promise<CheckoutResult>;
  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean;
}

export class MockBillingProvider implements BillingProvider {
  public readonly name = 'mock';

  public constructor(private readonly webhookSecret: string) {}

  public checkout(input: {
    userId: string;
    amount: string;
    currency: string;
  }): Promise<CheckoutResult> {
    void input;
    const id = randomUUID();
    return Promise.resolve({
      paymentReference: `MOCK-${id}`,
      providerPaymentId: `mock_${id}`,
      status: 'SUCCEEDED',
    });
  }

  public verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const provided = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
  }
}
