import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { MockBillingProvider } from './billing.provider.js';
import { validateWarrantyFile } from './file-security.js';

describe('customer document and billing providers', () => {
  it('verifies mock webhook signatures without trusting the body', () => {
    const secret = 'test-billing-webhook-secret-at-least-32';
    const provider = new MockBillingProvider(secret);
    const body = Buffer.from('{"id":"event-1"}');
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(provider.verifyWebhook(body, signature)).toBe(true);
    expect(provider.verifyWebhook(Buffer.from('changed'), signature)).toBe(false);
  });

  it('checks MIME, extension, and file signature together', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const file = {
      buffer: png,
      originalname: 'receipt.png',
      mimetype: 'image/png',
    } as Express.Multer.File;
    await expect(validateWarrantyFile(file)).resolves.toEqual({
      mimeType: 'image/png',
      extension: 'png',
    });
    await expect(
      validateWarrantyFile({ ...file, originalname: 'receipt.pdf' }),
    ).rejects.toMatchObject({ code: 'FILE_TYPE_INVALID' });
  });
});
