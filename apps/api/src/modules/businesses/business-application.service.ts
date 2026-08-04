import { createHash, randomUUID } from 'node:crypto';

import type {
  BusinessApplicationDto,
  BusinessRegistrationResultDto,
  GenericMessageDto,
  VerificationDocumentDto,
} from '@warrantypass/shared';
import { fileTypeFromBuffer } from 'file-type';
import type { PrismaClient } from '../../generated/prisma/client.js';

import type { AppConfig } from '../../config/env.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditWriter } from '../../common/security/contracts.js';
import type { PasswordHasher } from '../../common/security/password.js';
import type { RequestMetadata } from '../../common/security/request-metadata.js';
import type { TokenService } from '../../common/security/token.service.js';
import {
  normalizeBusinessIdentifier,
  normalizeEmail,
  slugifyBusinessName,
} from '../../common/utils/identifiers.js';
import { verificationEmail } from '../../infrastructure/email/email-templates.js';
import type { EmailProvider } from '../../infrastructure/email/email-provider.js';
import type { StorageProvider } from '../../infrastructure/storage/storage-provider.js';

export interface BusinessApplicationFields {
  ownerFullName: string;
  legalName: string;
  displayName: string;
  businessType: string;
  tradeLicenseNumber: string;
  binNumber?: string | undefined;
  yearEstablished?: number | undefined;
  phone: string;
  businessEmail: string;
  website?: string | undefined;
  addressLine: string;
  area: string;
  district: string;
  division: string;
  postalCode?: string | undefined;
}

export interface VerificationUpload {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  body: Buffer;
}

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export class BusinessApplicationService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordHasher,
    private readonly email: EmailProvider,
    private readonly storage: StorageProvider,
    private readonly audit: AuditWriter,
  ) {}

  public async register(
    input: BusinessApplicationFields & {
      password: string;
    },
    metadata: RequestMetadata,
  ): Promise<BusinessRegistrationResultDto> {
    const email = normalizeEmail(input.businessEmail);
    const duplicateUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });
    if (duplicateUser) {
      throw new AppError({
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'A business application cannot be created with those account details.',
        statusCode: 409,
      });
    }
    const ownerRole = await this.prisma.role.findUnique({
      where: { key: 'system:business-owner' },
    });
    if (!ownerRole) {
      throw new AppError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Business registration is temporarily unavailable.',
        statusCode: 503,
      });
    }

    const normalizedTradeLicense = normalizeBusinessIdentifier(input.tradeLicenseNumber);
    const normalizedBin = input.binNumber
      ? normalizeBusinessIdentifier(input.binNumber)
      : undefined;
    const duplicateIdentifier = await this.hasDuplicateIdentifiers(
      normalizedTradeLicense,
      normalizedBin,
    );
    const passwordHash = await this.passwords.hash(input.password);
    const rawEmailToken = this.tokens.createOpaqueToken();
    const now = new Date();
    const slug = `${slugifyBusinessName(input.displayName)}-${randomUUID().slice(0, 8)}`;

    const result = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email,
          passwordHash,
          status: 'PENDING',
          passwordChangedAt: now,
          profile: {
            create: { displayName: input.ownerFullName, locale: 'en-BD' },
          },
          termsAcceptances: {
            create: {
              termsVersion: this.config.TERMS_VERSION,
              privacyVersion: this.config.PRIVACY_VERSION,
              termsAcceptedAt: now,
              privacyAcceptedAt: now,
              ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
            },
          },
          emailVerificationTokens: {
            create: {
              tokenHash: this.tokens.hashToken(rawEmailToken),
              expiresAt: new Date(
                now.getTime() + this.config.EMAIL_VERIFICATION_EXPIRES_IN * 1_000,
              ),
            },
          },
        },
      });
      const business = await transaction.business.create({
        data: {
          name: input.displayName,
          legalName: input.legalName,
          slug,
          email,
          phone: input.phone,
          website: input.website || null,
          businessType: input.businessType,
          yearEstablished: input.yearEstablished ?? null,
          registrationType: 'TRADE_LICENSE',
          registrationNumber: input.tradeLicenseNumber,
          registrationNumberNormalized: normalizedTradeLicense,
          binNumber: input.binNumber || null,
          binNumberNormalized: normalizedBin ?? null,
          addressLine: input.addressLine,
          area: input.area,
          district: input.district,
          division: input.division,
          postalCode: input.postalCode || null,
          duplicateIdentifierFlag: duplicateIdentifier,
          status: 'DRAFT',
        },
      });
      const member = await transaction.businessMember.create({
        data: {
          businessId: business.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: 'ACTIVE',
          joinedAt: now,
        },
      });
      await transaction.memberRole.create({
        data: { memberId: member.id, roleId: ownerRole.id, assignedBy: user.id },
      });
      await transaction.businessVerificationRevision.create({
        data: {
          businessId: business.id,
          submittedByUserId: user.id,
          version: 1,
          status: 'DRAFT',
          ...this.revisionData(input),
        },
      });
      await transaction.businessVerificationStatusHistory.create({
        data: { businessId: business.id, newStatus: 'DRAFT' },
      });
      return { user, business };
    });

    const template = verificationEmail({
      verificationUrl: `${this.config.WEB_URL}/verify-email?token=${encodeURIComponent(rawEmailToken)}`,
      expiresInHours: Math.round(this.config.EMAIL_VERIFICATION_EXPIRES_IN / 3_600),
    });
    await this.email.send({ to: email, ...template });
    await this.audit.write({
      actorUserId: result.user.id,
      businessId: result.business.id,
      action: 'BUSINESS_DRAFT_CREATED',
      resourceType: 'Business',
      resourceId: result.business.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { duplicateIdentifierFlag: duplicateIdentifier },
    });
    return {
      userId: result.user.id,
      businessId: result.business.id,
      email,
      status: 'DRAFT',
      emailVerificationRequired: true,
      message: 'Business draft created. Verify the owner email before submitting the application.',
    };
  }

  public async getApplication(businessId: string, userId: string): Promise<BusinessApplicationDto> {
    await this.assertMembership(businessId, userId);
    return this.loadApplication(businessId);
  }

  public async updateDraft(
    businessId: string,
    userId: string,
    patch: Partial<BusinessApplicationFields>,
    expectedStatusVersion: number | undefined,
    metadata: RequestMetadata,
  ): Promise<BusinessApplicationDto> {
    await this.assertOwner(businessId, userId);
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundError('The business application was not found.');
    if (business.status !== 'DRAFT' && business.status !== 'MORE_INFORMATION_REQUIRED') {
      throw new AppError({
        code: 'BUSINESS_APPLICATION_PENDING',
        message: 'Submitted applications cannot be edited unless more information is requested.',
        statusCode: 409,
      });
    }
    if (expectedStatusVersion !== undefined && business.statusVersion !== expectedStatusVersion) {
      throw new AppError({
        code: 'CONFLICT',
        message: 'This application changed in another session. Reload it before saving.',
        statusCode: 409,
      });
    }

    const current = await this.editableRevision(businessId, userId);
    const merged = this.mergeApplication(business, current, patch);
    const normalizedTradeLicense = normalizeBusinessIdentifier(merged.tradeLicenseNumber);
    const normalizedBin = merged.binNumber
      ? normalizeBusinessIdentifier(merged.binNumber)
      : undefined;
    const duplicateIdentifier = await this.hasDuplicateIdentifiers(
      normalizedTradeLicense,
      normalizedBin,
      businessId,
    );

    await this.prisma.$transaction([
      this.prisma.business.update({
        where: { id: businessId },
        data: {
          name: merged.displayName,
          legalName: merged.legalName,
          email: normalizeEmail(merged.businessEmail),
          phone: merged.phone,
          website: merged.website || null,
          businessType: merged.businessType,
          yearEstablished: merged.yearEstablished ?? null,
          registrationNumber: merged.tradeLicenseNumber,
          registrationNumberNormalized: normalizedTradeLicense,
          binNumber: merged.binNumber || null,
          binNumberNormalized: normalizedBin ?? null,
          addressLine: merged.addressLine,
          area: merged.area,
          district: merged.district,
          division: merged.division,
          postalCode: merged.postalCode || null,
          duplicateIdentifierFlag: duplicateIdentifier,
          statusVersion: { increment: 1 },
        },
      }),
      this.prisma.businessVerificationRevision.update({
        where: { id: current.id },
        data: {
          ...this.revisionData(merged),
          tradeLicenseNumberNormalized: normalizedTradeLicense,
          binNumberNormalized: normalizedBin ?? null,
        },
      }),
    ]);
    await this.audit.write({
      actorUserId: userId,
      businessId,
      action: 'BUSINESS_DRAFT_UPDATED',
      resourceType: 'Business',
      resourceId: businessId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return this.loadApplication(businessId);
  }

  public async uploadDocument(
    businessId: string,
    userId: string,
    kind: 'TRADE_LICENSE' | 'BIN' | 'SUPPORTING',
    file: VerificationUpload,
    metadata: RequestMetadata,
  ): Promise<VerificationDocumentDto> {
    await this.assertOwner(businessId, userId);
    if (file.sizeBytes > this.config.VERIFICATION_DOCUMENT_MAX_BYTES) {
      throw new AppError({
        code: 'FILE_TOO_LARGE',
        message: 'The document exceeds the allowed file size.',
        statusCode: 413,
      });
    }
    const detected = await fileTypeFromBuffer(file.body);
    if (!detected || !allowedTypes.has(detected.mime) || detected.mime !== file.mimeType) {
      throw new AppError({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: 'Upload a PDF, JPEG, PNG, or WebP document with a valid file signature.',
        statusCode: 415,
      });
    }
    const revision = await this.editableRevision(businessId, userId);
    const extension = detected.ext.replace(/[^a-z0-9]/gi, '');
    const storageKey = `business-verification/${businessId}/${revision.id}/${randomUUID()}.${extension}`;
    const checksumSha256 = createHash('sha256').update(file.body).digest('hex');
    await this.storage.putObject({
      storageKey,
      contentType: detected.mime,
      body: file.body,
      checksumSha256,
    });

    try {
      const document = await this.prisma.businessVerificationDocument.create({
        data: {
          businessId,
          revisionId: revision.id,
          uploadedByUserId: userId,
          kind,
          storageKey,
          displayName: safeDisplayName(file.originalName),
          originalName: safeDisplayName(file.originalName),
          mimeType: detected.mime,
          sizeBytes: file.sizeBytes,
          checksumSha256,
          // Local development treats signature-validated files as safe. Production must
          // replace this with the documented quarantine/malware-scanning workflow.
          scanStatus: this.config.NODE_ENV === 'production' ? 'PENDING_SCAN' : 'SAFE',
          ...(this.config.NODE_ENV === 'production' ? {} : { scannedAt: new Date() }),
        },
      });
      await this.audit.write({
        actorUserId: userId,
        businessId,
        action: 'BUSINESS_VERIFICATION_DOCUMENT_UPLOADED',
        resourceType: 'BusinessVerificationDocument',
        resourceId: document.id,
        requestId: metadata.requestId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: { kind, sizeBytes: file.sizeBytes, mimeType: detected.mime },
      });
      return mapDocument(document);
    } catch (error) {
      await this.storage.delete(storageKey);
      throw error;
    }
  }

  public async removeDocument(
    businessId: string,
    userId: string,
    documentId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    await this.assertOwner(businessId, userId);
    const document = await this.prisma.businessVerificationDocument.findFirst({
      where: { id: documentId, businessId, deletedAt: null },
      include: { revision: true },
    });
    if (!document) throw new NotFoundError('The verification document was not found.');
    if (document.revision.status !== 'DRAFT') {
      throw new AppError({
        code: 'BUSINESS_APPLICATION_PENDING',
        message: 'Documents cannot be removed after this revision is submitted.',
        statusCode: 409,
      });
    }
    await this.prisma.businessVerificationDocument.update({
      where: { id: document.id },
      data: { deletedAt: new Date(), scanStatus: 'DELETED' },
    });
    await this.storage.delete(document.storageKey);
    await this.audit.write({
      actorUserId: userId,
      businessId,
      action: 'BUSINESS_VERIFICATION_DOCUMENT_REMOVED',
      resourceType: 'BusinessVerificationDocument',
      resourceId: document.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  public async downloadDocument(
    businessId: string,
    documentId: string,
    actorUserId: string,
    metadata: RequestMetadata,
  ): Promise<{ body: Buffer; mimeType: string; displayName: string }> {
    const document = await this.prisma.businessVerificationDocument.findFirst({
      where: { id: documentId, businessId, deletedAt: null },
    });
    if (!document) throw new NotFoundError('The verification document was not found.');
    const stored = await this.storage.readObject(document.storageKey);
    if (!stored) throw new NotFoundError('The stored document could not be found.');
    await this.audit.write({
      actorUserId,
      businessId,
      action: 'BUSINESS_VERIFICATION_DOCUMENT_ACCESSED',
      resourceType: 'BusinessVerificationDocument',
      resourceId: document.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return { body: stored.body, mimeType: document.mimeType, displayName: document.displayName };
  }

  public async submit(
    businessId: string,
    userId: string,
    metadata: RequestMetadata,
  ): Promise<BusinessApplicationDto> {
    await this.assertOwner(businessId, userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.emailVerifiedAt) {
      throw new AppError({
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Verify the owner email before submitting the application.',
        statusCode: 403,
      });
    }
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundError('The business application was not found.');
    if (business.status !== 'DRAFT' && business.status !== 'MORE_INFORMATION_REQUIRED') {
      throw new AppError({
        code: 'BUSINESS_APPLICATION_PENDING',
        message: 'This application is already submitted.',
        statusCode: 409,
      });
    }
    const revision = await this.editableRevision(businessId, userId);
    const documents = await this.prisma.businessVerificationDocument.findMany({
      where: { revisionId: revision.id, deletedAt: null },
    });
    const tradeLicense = documents.find((document) => document.kind === 'TRADE_LICENSE');
    if (!tradeLicense) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Upload the trade licence document before submitting.',
        statusCode: 400,
      });
    }
    if (documents.some((document) => document.scanStatus !== 'SAFE')) {
      throw new AppError({
        code: 'FILE_SCAN_PENDING',
        message: 'Wait until all documents pass the security scan before submitting.',
        statusCode: 409,
      });
    }
    const now = new Date();
    const reference = business.verificationReference ?? createReference();
    await this.prisma.$transaction([
      this.prisma.business.update({
        where: { id: businessId },
        data: {
          status: 'PENDING',
          verificationReference: reference,
          statusVersion: { increment: 1 },
        },
      }),
      this.prisma.businessVerificationRevision.update({
        where: { id: revision.id },
        data: { status: 'SUBMITTED', submittedAt: now },
      }),
      this.prisma.businessVerification.create({
        data: {
          businessId,
          submittedByUserId: userId,
          status: 'PENDING',
          referenceNumber: reference,
          submittedAt: now,
          submittedNotes: `Revision ${revision.version}`,
        },
      }),
      this.prisma.businessVerificationStatusHistory.create({
        data: {
          businessId,
          previousStatus: business.status,
          newStatus: 'PENDING',
        },
      }),
    ]);
    await this.audit.write({
      actorUserId: userId,
      businessId,
      action: 'BUSINESS_APPLICATION_SUBMITTED',
      resourceType: 'Business',
      resourceId: businessId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { reference, revision: revision.version },
    });
    return this.loadApplication(businessId);
  }

  public async switchBusiness(userId: string, businessId: string): Promise<GenericMessageDto> {
    const membership = await this.prisma.businessMember.findFirst({
      where: { userId, businessId, status: 'ACTIVE', deletedAt: null },
    });
    if (!membership) {
      throw new AppError({
        code: 'BUSINESS_MEMBERSHIP_REQUIRED',
        message: 'You do not have access to that business.',
        statusCode: 403,
      });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { lastActiveBusinessId: businessId },
      }),
      this.prisma.businessMember.update({
        where: { id: membership.id },
        data: { lastActiveAt: new Date() },
      }),
    ]);
    return { message: 'Business workspace changed.' };
  }

  private async loadApplication(businessId: string): Promise<BusinessApplicationDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        verificationRevisions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: { documents: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } } },
        },
        verificationStatusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const revision = business?.verificationRevisions[0];
    if (!business || !revision) throw new NotFoundError('The business application was not found.');
    return {
      id: business.id,
      slug: business.slug,
      referenceNumber: business.verificationReference,
      status: business.status === 'PENDING_VERIFICATION' ? 'PENDING' : business.status,
      statusVersion: business.statusVersion,
      ownerFullName: revision.ownerFullName,
      legalName: revision.legalName,
      displayName: revision.displayName,
      businessType: revision.businessType,
      tradeLicenseNumber: revision.tradeLicenseNumber,
      binNumber: revision.binNumber,
      yearEstablished: revision.yearEstablished,
      phone: revision.phone,
      businessEmail: revision.businessEmail,
      website: revision.website,
      addressLine: revision.addressLine,
      area: revision.area,
      district: revision.district,
      division: revision.division,
      postalCode: revision.postalCode,
      duplicateIdentifierFlag: business.duplicateIdentifierFlag,
      submittedAt: revision.submittedAt?.toISOString() ?? null,
      userVisibleReason: business.verificationStatusHistory[0]?.userVisibleReason ?? null,
      documents: revision.documents.map(mapDocument),
    };
  }

  private async editableRevision(businessId: string, userId: string) {
    const latest = await this.prisma.businessVerificationRevision.findFirst({
      where: { businessId },
      orderBy: { version: 'desc' },
    });
    if (!latest) throw new NotFoundError('The business application revision was not found.');
    if (latest.status === 'DRAFT') return latest;
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    const owner = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!business) throw new NotFoundError('The business application was not found.');
    return this.prisma.businessVerificationRevision.create({
      data: {
        businessId,
        submittedByUserId: userId,
        version: latest.version + 1,
        status: 'DRAFT',
        ownerFullName: owner?.displayName ?? latest.ownerFullName,
        legalName: business.legalName ?? latest.legalName,
        displayName: business.name,
        businessType: business.businessType ?? latest.businessType,
        tradeLicenseNumber: business.registrationNumber,
        tradeLicenseNumberNormalized:
          business.registrationNumberNormalized ??
          normalizeBusinessIdentifier(business.registrationNumber),
        binNumber: business.binNumber,
        binNumberNormalized: business.binNumberNormalized,
        yearEstablished: business.yearEstablished,
        phone: business.phone ?? latest.phone,
        businessEmail: business.email,
        website: business.website,
        addressLine: business.addressLine ?? latest.addressLine,
        area: business.area ?? latest.area,
        district: business.district ?? latest.district,
        division: business.division ?? latest.division,
        postalCode: business.postalCode,
      },
    });
  }

  private async assertMembership(businessId: string, userId: string): Promise<void> {
    const membership = await this.prisma.businessMember.findFirst({
      where: { businessId, userId, status: 'ACTIVE', deletedAt: null },
    });
    if (!membership) {
      throw new AppError({
        code: 'BUSINESS_MEMBERSHIP_REQUIRED',
        message: 'You do not have access to this business application.',
        statusCode: 403,
      });
    }
  }

  private async assertOwner(businessId: string, userId: string): Promise<void> {
    const membership = await this.prisma.businessMember.findFirst({
      where: { businessId, userId, status: 'ACTIVE', deletedAt: null },
      include: { role: true, roles: { include: { role: true } } },
    });
    const owner =
      membership &&
      (membership.role.key === 'system:business-owner' ||
        membership.roles.some((assignment) => assignment.role.key === 'system:business-owner'));
    if (!owner) {
      throw new AppError({
        code: 'BUSINESS_PERMISSION_DENIED',
        message: 'Only an active business owner can change the verification application.',
        statusCode: 403,
      });
    }
  }

  private async hasDuplicateIdentifiers(
    tradeLicense: string,
    bin: string | undefined,
    excludedBusinessId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.business.count({
      where: {
        ...(excludedBusinessId ? { id: { not: excludedBusinessId } } : {}),
        deletedAt: null,
        OR: [
          { registrationNumberNormalized: tradeLicense },
          ...(bin ? [{ binNumberNormalized: bin }] : []),
        ],
      },
    });
    return count > 0;
  }

  private revisionData(input: BusinessApplicationFields) {
    return {
      ownerFullName: input.ownerFullName,
      legalName: input.legalName,
      displayName: input.displayName,
      businessType: input.businessType,
      tradeLicenseNumber: input.tradeLicenseNumber,
      tradeLicenseNumberNormalized: normalizeBusinessIdentifier(input.tradeLicenseNumber),
      binNumber: input.binNumber || null,
      binNumberNormalized: input.binNumber ? normalizeBusinessIdentifier(input.binNumber) : null,
      yearEstablished: input.yearEstablished ?? null,
      phone: input.phone,
      businessEmail: normalizeEmail(input.businessEmail),
      website: input.website || null,
      addressLine: input.addressLine,
      area: input.area,
      district: input.district,
      division: input.division,
      postalCode: input.postalCode || null,
    };
  }

  private mergeApplication(
    business: {
      name: string;
      legalName: string | null;
      businessType: string | null;
      registrationNumber: string;
      binNumber: string | null;
      yearEstablished: number | null;
      phone: string | null;
      email: string;
      website: string | null;
      addressLine: string | null;
      area: string | null;
      district: string | null;
      division: string | null;
      postalCode: string | null;
    },
    revision: { ownerFullName: string },
    patch: Partial<BusinessApplicationFields>,
  ): BusinessApplicationFields {
    return {
      ownerFullName: patch.ownerFullName ?? revision.ownerFullName,
      legalName: patch.legalName ?? business.legalName ?? business.name,
      displayName: patch.displayName ?? business.name,
      businessType: patch.businessType ?? business.businessType ?? 'Other',
      tradeLicenseNumber: patch.tradeLicenseNumber ?? business.registrationNumber,
      binNumber: patch.binNumber ?? business.binNumber ?? undefined,
      yearEstablished: patch.yearEstablished ?? business.yearEstablished ?? undefined,
      phone: patch.phone ?? business.phone ?? '',
      businessEmail: patch.businessEmail ?? business.email,
      website: patch.website ?? business.website ?? undefined,
      addressLine: patch.addressLine ?? business.addressLine ?? '',
      area: patch.area ?? business.area ?? '',
      district: patch.district ?? business.district ?? '',
      division: patch.division ?? business.division ?? '',
      postalCode: patch.postalCode ?? business.postalCode ?? undefined,
    };
  }
}

function mapDocument(document: {
  id: string;
  kind: 'TRADE_LICENSE' | 'BIN' | 'SUPPORTING';
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: 'UPLOADED' | 'PENDING_SCAN' | 'SAFE' | 'REJECTED' | 'DELETED';
  createdAt: Date;
}): VerificationDocumentDto {
  return {
    id: document.id,
    kind: document.kind,
    displayName: document.displayName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    scanStatus: document.scanStatus,
    createdAt: document.createdAt.toISOString(),
  };
}

function safeDisplayName(originalName: string): string {
  const normalized = [...originalName.normalize('NFKC')]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join('')
    .trim();
  return normalized.slice(0, 255) || 'Verification document';
}

function createReference(): string {
  return `WP-BIZ-${new Date().getUTCFullYear()}-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}
