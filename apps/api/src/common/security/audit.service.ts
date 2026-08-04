import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuditEvent, AuditWriter } from './contracts.js';

const allowedMetadataTypes = new Set(['string', 'number', 'boolean']);

export class AuditService implements AuditWriter {
  public constructor(private readonly prisma: PrismaClient) {}

  public async write(event: AuditEvent): Promise<void> {
    const metadata = event.metadata
      ? Object.fromEntries(
          Object.entries(event.metadata).filter(
            ([key, value]) =>
              !/(password|token|secret|document|authorization|cookie)/i.test(key) &&
              (value === null || allowedMetadataTypes.has(typeof value)),
          ),
        )
      : undefined;

    await this.prisma.auditLog.create({
      data: {
        action: event.action,
        resourceType: event.resourceType,
        ...(event.actorUserId ? { actorUserId: event.actorUserId } : {}),
        ...(event.businessId ? { businessId: event.businessId } : {}),
        ...(event.resourceId ? { resourceId: event.resourceId } : {}),
        ...(event.requestId ? { requestId: event.requestId } : {}),
        ...(event.ipAddress ? { ipAddress: event.ipAddress } : {}),
        ...(event.userAgent ? { userAgent: event.userAgent } : {}),
        ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
      },
    });
  }
}
