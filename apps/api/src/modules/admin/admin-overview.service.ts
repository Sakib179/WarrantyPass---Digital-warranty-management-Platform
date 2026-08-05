import type { PrismaClient } from '../../generated/prisma/client.js';

export class AdminOverviewService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOperationalMetrics() {
    const [
      totalUsers,
      activeUsers,
      totalBusinesses,
      verifiedBusinesses,
      pendingBusinessVerifications,
      suspendedBusinesses,
      activeSubscriptions,
      warrantiesIssued,
      openClaims,
      activeRepairs,
      pendingTransfers,
      activeRecalls,
      failedBackgroundJobs,
      recentSecurityEventsCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.business.count({ where: { deletedAt: null } }),
      this.prisma.business.count({ where: { status: 'VERIFIED', deletedAt: null } }),
      this.prisma.businessVerification.count({ where: { status: 'PENDING_REVIEW' as any } }),
      this.prisma.business.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.warranty.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.warrantyClaim.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED'] } } }),
      this.prisma.repairRecord.count({ where: { currentStatus: { notIn: ['COMPLETED', 'DELIVERED', 'CANCELLED'] } } }),
      this.prisma.ownershipTransfer.count({ where: { status: 'PENDING_BUSINESS_APPROVAL' } }),
      this.prisma.recallNotice.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.backgroundJob.count({ where: { status: 'FAILED' } }),
      this.prisma.securityEvent.count({
        where: { detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalBusinesses,
      verifiedBusinesses,
      pendingBusinessVerifications,
      suspendedBusinesses,
      activeSubscriptions,
      warrantiesIssued,
      openClaims,
      activeRepairs,
      pendingTransfers,
      activeRecalls,
      failedBackgroundJobs,
      recentSecurityEventsCount,
    };
  }
}
