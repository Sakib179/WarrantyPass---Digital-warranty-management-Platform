import type { PrismaClient } from '../../generated/prisma/client.js';
import type { VerifyWarrantyInput } from '@warrantypass/validation';

export interface PublicVerificationResult {
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

export class VerificationService {
  public constructor(private readonly prisma: PrismaClient) {}

  private maskSerialNumber(serial: string | null): string | null {
    if (!serial) return null;
    if (serial.length <= 4) return '****';
    const prefix = serial.slice(0, 3);
    const suffix = serial.slice(-2);
    return `${prefix}***${suffix}`;
  }

  public async verifyWarranty(
    input: VerifyWarrantyInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PublicVerificationResult> {
    const warranty = await this.prisma.warranty.findFirst({
      where: {
        warrantyNumber: input.warrantyNumber.trim(),
        deletedAt: null,
      },
      include: {
        issuerBusiness: { select: { name: true, status: true } },
        catalogProduct: { include: { brand: true } },
        customerProduct: { include: { brand: true } },
      },
    });

    const attemptResult = warranty ? (warranty.source === 'BUSINESS_ISSUED' ? 'VERIFIED_BUSINESS' : 'USER_UPLOADED') : 'NOT_FOUND';

    await this.prisma.warrantyVerificationAttempt.create({
      data: {
        warrantyNumber: input.warrantyNumber,
        serialNumber: input.serialNumber ? this.maskSerialNumber(input.serialNumber) : null,
        verificationCode: input.verificationCode ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        result: attemptResult,
        matchedWarrantyId: warranty?.id ?? null,
      },
    });

    if (!warranty) {
      return {
        verified: false,
        warrantyNumber: input.warrantyNumber,
        verificationCodeProvided: Boolean(input.verificationCode),
        serialNumberMasked: null,
        status: null,
        verificationLabel: 'UNVERIFIED',
        isUserUploaded: false,
        issuingBusinessName: null,
        productBrand: null,
        productModel: null,
        startDate: null,
        endDate: null,
        revoked: false,
        disclaimer: 'No warranty record matching the provided number was found in the global registry.',
      };
    }

    const isUserUploaded = warranty.source === 'USER_UPLOADED';
    const serialMasked = this.maskSerialNumber(warranty.serialNumber);

    const brandName = warranty.catalogProduct?.brand?.name || warranty.customerProduct?.brand?.name || null;
    const modelNumber = warranty.catalogProduct?.modelNumber || warranty.customerProduct?.modelNumber || null;

    if (isUserUploaded) {
      return {
        verified: false,
        warrantyNumber: warranty.warrantyNumber ?? input.warrantyNumber,
        verificationCodeProvided: false,
        serialNumberMasked: serialMasked,
        status: warranty.status,
        verificationLabel: 'UNVERIFIED_USER_UPLOADED',
        isUserUploaded: true,
        issuingBusinessName: null,
        productBrand: brandName,
        productModel: modelNumber,
        startDate: warranty.startDate?.toISOString() ?? null,
        endDate: warranty.endDate?.toISOString() ?? null,
        revoked: warranty.status === 'REVOKED',
        disclaimer: 'This record was uploaded by a user and has not been verified by the original business issuer.',
      };
    }

    return {
      verified: warranty.status === 'ACTIVE',
      warrantyNumber: warranty.warrantyNumber ?? input.warrantyNumber,
      verificationCodeProvided: Boolean(input.verificationCode),
      serialNumberMasked: serialMasked,
      status: warranty.status,
      verificationLabel: warranty.verificationLabel,
      isUserUploaded: false,
      issuingBusinessName: warranty.issuerBusiness?.name ?? 'Verified Issuer',
      productBrand: brandName,
      productModel: modelNumber,
      startDate: warranty.startDate?.toISOString() ?? null,
      endDate: warranty.endDate?.toISOString() ?? null,
      revoked: warranty.status === 'REVOKED',
      revocationReason: warranty.status === 'REVOKED' ? warranty.revocationReason : null,
      disclaimer: 'Official verified digital warranty record issued by a verified merchant partner on WarrantyPass.',
    };
  }
}
