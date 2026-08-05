import type { PrismaClient } from '../../generated/prisma/client.js';
import { AppError } from '../../common/errors/app-error.js';
import type {
  AdminUserActionInput,
  AdminBusinessActionInput,
  AdminSubscriptionOverrideInput,
  AdminUpdateSystemSettingInput,
  AdminUpdateFeatureFlagInput,
  AdminResolveSecurityEventInput,
} from '@warrantypass/validation';

export class AdminService {
  public constructor(private readonly prisma: PrismaClient) {}

  // 1. User Administration
  public async searchUsers(query?: string) {
    const where: any = { deletedAt: null };
    if (query) {
      where.OR = [
        { email: { contains: query, mode: 'insensitive' } },
        { profile: { is: { displayName: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        profile: true,
        _count: { select: { sessions: true, customerProducts: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return users.map((u) => ({
      ...u,
      fullName: u.profile?.displayName || u.email,
      phoneNumber: u.profile?.phone || 'N/A',
      sessionCount: u._count?.sessions || 0,
      productCount: u._count?.customerProducts || 0,
    }));
  }

  public async performUserAction(adminUserId: string, userId: string, input: AdminUserActionInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError({ code: 'NOT_FOUND', message: 'User not found', statusCode: 404 });

    if (input.action === 'SUSPEND') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });
      // Revoke sessions
      await this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: `Admin suspension: ${input.reason}` },
      });
    } else if (input.action === 'RESTORE') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    } else if (input.action === 'REVOKE_SESSIONS') {
      await this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: `Admin action: ${input.reason}` },
      });
    }

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: `admin.user.${input.action.toLowerCase()}`,
        resourceType: 'User',
        resourceId: userId,
        metadata: { reason: input.reason },
      },
    });

    return { success: true, action: input.action };
  }

  // 2. Business Administration
  public async searchBusinesses(query?: string) {
    const businesses = await this.prisma.business.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { registrationNumber: { contains: query, mode: 'insensitive' } },
            ],
            deletedAt: null,
          }
        : { deletedAt: null },
      include: {
        _count: { select: { members: true, issuedWarranties: true, claims: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return businesses.map((b) => ({
      ...b,
      memberCount: b._count.members,
      warrantyCount: b._count.issuedWarranties,
      claimCount: b._count.claims,
    }));
  }

  public async performBusinessAction(adminUserId: string, businessId: string, input: AdminBusinessActionInput) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new AppError({ code: 'NOT_FOUND', message: 'Business not found', statusCode: 404 });

    const newStatus = input.action === 'SUSPEND' ? 'SUSPENDED' : input.action === 'RESTORE' ? 'VERIFIED' : input.action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';

    await this.prisma.business.update({
      where: { id: businessId },
      data: { status: newStatus as any },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        businessId,
        action: `admin.business.${input.action.toLowerCase()}`,
        resourceType: 'Business',
        resourceId: businessId,
        metadata: { reason: input.reason },
      },
    });

    return { success: true, action: input.action, newStatus };
  }

  // 3. Subscription Administration
  public async listSubscriptions() {
    return await this.prisma.subscription.findMany({
      include: {
        user: { select: { id: true, email: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  public async overrideSubscription(adminUserId: string, subscriptionId: string, input: AdminSubscriptionOverrideInput) {
    const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) throw new AppError({ code: 'NOT_FOUND', message: 'Subscription not found', statusCode: 404 });

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planKey: input.planKey,
        status: input.status,
        currentPeriodEnd: new Date(input.currentPeriodEnd),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'admin.subscription.override',
        resourceType: 'Subscription',
        resourceId: subscriptionId,
        metadata: { ...input, sourceLabel: 'ADMIN_OVERRIDE' },
      },
    });

    return updated;
  }

  // 4. System Settings & Feature Flags
  public async listSystemSettings() {
    return await this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  }

  public async updateSystemSetting(adminUserId: string, input: AdminUpdateSystemSettingInput) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: input.key },
      update: { value: input.value, description: input.description ?? null, updatedByUserId: adminUserId },
      create: { key: input.key, value: input.value, description: input.description ?? null, updatedByUserId: adminUserId },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'admin.system_setting.update',
        resourceType: 'SystemSetting',
        resourceId: setting.id,
        metadata: { key: input.key, value: input.value },
      },
    });

    return setting;
  }

  public async listFeatureFlags() {
    return await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  public async updateFeatureFlag(adminUserId: string, input: AdminUpdateFeatureFlagInput) {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key: input.key },
      update: { isEnabled: input.isEnabled, description: input.description ?? null, updatedByUserId: adminUserId },
      create: { key: input.key, isEnabled: input.isEnabled, description: input.description ?? null, updatedByUserId: adminUserId },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'admin.feature_flag.update',
        resourceType: 'FeatureFlag',
        resourceId: flag.id,
        metadata: { key: input.key, isEnabled: input.isEnabled },
      },
    });

    return flag;
  }

  // 5. Audit Log Viewer & Security Events
  public async listAuditLogs(filters: { action?: string; resourceType?: string; search?: string }) {
    return await this.prisma.auditLog.findMany({
      where: {
        ...(filters.action ? { action: { contains: filters.action, mode: 'insensitive' } } : {}),
        ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
      },
      include: {
        actorUser: { select: { id: true, email: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  public async listSecurityEvents() {
    return await this.prisma.securityEvent.findMany({
      include: {
        actorUser: { select: { id: true, email: true } },
        business: { select: { id: true, name: true } },
      },
      orderBy: { detectedAt: 'desc' },
      take: 100,
    });
  }

  public async resolveSecurityEvent(adminUserId: string, eventId: string, input: AdminResolveSecurityEventInput) {
    const event = await this.prisma.securityEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError({ code: 'NOT_FOUND', message: 'Security event not found', statusCode: 404 });

    const updated = await this.prisma.securityEvent.update({
      where: { id: eventId },
      data: {
        resolvedAt: new Date(),
        resolutionNote: input.resolutionNote,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'admin.security_event.resolve',
        resourceType: 'SecurityEvent',
        resourceId: eventId,
        metadata: { resolutionNote: input.resolutionNote },
      },
    });

    return updated;
  }
}
