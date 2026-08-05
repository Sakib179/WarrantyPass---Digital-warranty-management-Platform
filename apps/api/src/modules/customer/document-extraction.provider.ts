import type { DocumentExtractionDto, ExtractedFieldDto } from '@warrantypass/shared';

export interface ExtractionInput {
  mimeType: string;
  content: Buffer;
}

export interface DocumentExtractionProvider {
  readonly name: string;
  extract(input: ExtractionInput): Promise<DocumentExtractionDto['fields']>;
}

const field = (value: string, confidence: number): ExtractedFieldDto => ({ value, confidence });

export class MockDocumentExtractionProvider implements DocumentExtractionProvider {
  public readonly name = 'mock';

  public extract(input: ExtractionInput): Promise<DocumentExtractionDto['fields']> {
    void input;
    return Promise.resolve({
      productName: field('Demo Smart Appliance', 0.76),
      brand: field('Demo Brand', 0.82),
      modelNumber: field('WP-DEMO-100', 0.68),
      purchaseDate: field(new Date().toISOString().slice(0, 10), 0.71),
      sellerName: field('Demo Electronics Store', 0.64),
      warrantyPeriod: field('1 year', 0.59),
    });
  }
}
