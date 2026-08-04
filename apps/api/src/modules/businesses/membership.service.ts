import { randomUUID } from 'node:crypto';

import type {
  BusinessInvitationDto,
  BusinessMemberDto,
  BusinessPermission,
  BusinessRoleDto,
  GenericMessageDto,
} from '@warrantypass/shared';
import { DEFAULT_ROLE_KEYS } from '@warrantypass/shared';
import type { PrismaClient } from '../../generated/prisma/client.js';

import type { AppConfig } from '../../config/env.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditWriter, BusinessAuthorizationContext } from '../../common/security/contracts.js';
import type { RequestMetadata } from '../../common/security/request-metadata.js';
import type { TokenService } from '../../common/security/token.service.js';
import { normalizeEmail, slugifyBusinessName } from '../../common/utils/identifiers.js';
import { invitationEmail } from '../../infrastructure/email/email-templates.js';
import type { EmailProvider } from '../../infrastructure/email/email-provider.js';

export class MembershipService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly tokens: TokenService,
    private readonly email: EmailProvider,
    private readonly audit: AuditWriter,
  ) {}

  public async listMembers(context: BusinessAuthorizationContext): Promise<BusinessMemberDto[]> {
    const members = await this.prisma.businessMember.findMany({
      where: { businessId: context.businessId, deletedAt: null },
      include: {
        user: { include: { profile: true } },
        role: true,
        roles: { include: { role: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.profile?.displayName ?? member.user.email,
      email: member.user.email,
      status: member.status,
      roles: (member.roles.length > 0
        ? member.roles.map((assignment) => assignment.role)
        : [member.role]
      ).map((role) => ({ id: role.id, name: role.name })),
      joinedAt: member.joinedAt?.toISOString() ?? null,
      lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
    }));
  }

  public async listInvitations(
    context: BusinessAuthorizationContext,
  ): Promise<BusinessInvitationDto[]> {
    const invitations = await this.prisma.businessInvitation.findMany({
      where: { businessId: context.businessId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    const now = Date.now();
    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: { id: invitation.role.id, name: invitation.role.name },
      status:
        invitation.status === 'PENDING' && invitation.expiresAt.getTime() <= now
          ? 'EXPIRED'
          : invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    }));
  }

  public async invite(
    context: BusinessAuthorizationContext,
    input: {
      email: string;
      roleId: string;
      personalMessage?: string;
      expiresInDays: number;
    },
    metadata: RequestMetadata,
  ): Promise<BusinessInvitationDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: context.businessId },
    });
    if (!business || business.status !== 'VERIFIED') {
      throw new AppError({
        code: 'BUSINESS_NOT_VERIFIED',
        message: 'Only verified businesses can invite employees.',
        statusCode: 403,
      });
    }
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (user) {
      const existingMember = await this.prisma.businessMember.findUnique({
        where: { businessId_userId: { businessId: context.businessId, userId: user.id } },
      });
      if (existingMember?.status === 'ACTIVE') {
        throw new AppError({
          code: 'BUSINESS_MEMBERSHIP_REQUIRED',
          message: 'That person is already an active member.',
          statusCode: 409,
        });
      }
    }
    const pending = await this.prisma.businessInvitation.findFirst({
      where: {
        businessId: context.businessId,
        email: { equals: email, mode: 'insensitive' },
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) {
      throw new AppError({
        code: 'CONFLICT',
        message: 'A pending invitation already exists for that email.',
        statusCode: 409,
      });
    }
    const role = await this.authorizableRole(context, input.roleId);
    const rawToken = this.tokens.createOpaqueToken();
    const invitation = await this.prisma.businessInvitation.create({
      data: {
        businessId: context.businessId,
        roleId: role.id,
        invitedByUserId: context.userId,
        email,
        tokenHash: this.tokens.hashToken(rawToken),
        personalMessage: input.personalMessage ?? null,
        expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
      },
      include: { role: true },
    });
    const template = invitationEmail({
      businessName: business.name,
      invitationUrl: `${this.config.WEB_URL}/invitations/accept?token=${encodeURIComponent(rawToken)}`,
      expiresInDays: input.expiresInDays,
      ...(input.personalMessage ? { personalMessage: input.personalMessage } : {}),
    });
    await this.email.send({ to: email, ...template });
    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'INVITATION_CREATED',
      resourceType: 'BusinessInvitation',
      resourceId: invitation.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { roleId: role.id },
    });
    return mapInvitation(invitation);
  }

  public async resendInvitation(
    context: BusinessAuthorizationContext,
    invitationId: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const invitation = await this.prisma.businessInvitation.findFirst({
      where: { id: invitationId, businessId: context.businessId, status: 'PENDING' },
      include: { business: true, role: true },
    });
    if (!invitation) throw new NotFoundError('The pending invitation was not found.');
    await this.authorizableRole(context, invitation.roleId);
    const rawToken = this.tokens.createOpaqueToken();
    const expiresAt = new Date(Date.now() + this.config.INVITATION_EXPIRES_IN * 1_000);
    await this.prisma.businessInvitation.update({
      where: { id: invitation.id },
      data: { tokenHash: this.tokens.hashToken(rawToken), expiresAt },
    });
    const template = invitationEmail({
      businessName: invitation.business.name,
      invitationUrl: `${this.config.WEB_URL}/invitations/accept?token=${encodeURIComponent(rawToken)}`,
      expiresInDays: Math.round(this.config.INVITATION_EXPIRES_IN / 86_400),
      ...(invitation.personalMessage ? { personalMessage: invitation.personalMessage } : {}),
    });
    await this.email.send({ to: invitation.email, ...template });
    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'INVITATION_RESENT',
      resourceType: 'BusinessInvitation',
      resourceId: invitation.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return { message: 'Invitation resent.' };
  }

  public async revokeInvitation(
    context: BusinessAuthorizationContext,
    invitationId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const invitation = await this.prisma.businessInvitation.findFirst({
      where: { id: invitationId, businessId: context.businessId, status: 'PENDING' },
    });
    if (!invitation) throw new NotFoundError('The pending invitation was not found.');
    await this.prisma.businessInvitation.update({
      where: { id: invitation.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'INVITATION_REVOKED',
      resourceType: 'BusinessInvitation',
      resourceId: invitation.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  public async acceptInvitation(
    userId: string,
    rawToken: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const invitation = await this.prisma.businessInvitation.findUnique({
      where: { tokenHash: this.tokens.hashToken(rawToken) },
      include: { role: true, business: true },
    });
    if (!invitation || invitation.status !== 'PENDING') {
      throw new AppError({
        code: 'BUSINESS_INVITATION_INVALID',
        message: 'This invitation is invalid or has already been used.',
        statusCode: 400,
      });
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.prisma.businessInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new AppError({
        code: 'BUSINESS_INVITATION_EXPIRED',
        message: 'This invitation has expired.',
        statusCode: 400,
      });
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.emailVerifiedAt || normalizeEmail(user.email) !== normalizeEmail(invitation.email)) {
      throw new AppError({
        code: 'BUSINESS_INVITATION_INVALID',
        message: 'Sign in with the verified email address that received this invitation.',
        statusCode: 403,
      });
    }
    const existing = await this.prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: invitation.businessId, userId } },
    });
    if (existing?.status === 'ACTIVE') {
      throw new AppError({
        code: 'CONFLICT',
        message: 'You are already a member of this business.',
        statusCode: 409,
      });
    }
    const now = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const member = existing
        ? await transaction.businessMember.update({
            where: { id: existing.id },
            data: {
              roleId: invitation.roleId,
              status: 'ACTIVE',
              joinedAt: now,
              removedAt: null,
              suspendedAt: null,
              deletedAt: null,
              invitedByUserId: invitation.invitedByUserId,
            },
          })
        : await transaction.businessMember.create({
            data: {
              businessId: invitation.businessId,
              userId,
              roleId: invitation.roleId,
              status: 'ACTIVE',
              joinedAt: now,
              invitedByUserId: invitation.invitedByUserId,
            },
          });
      await transaction.memberRole.deleteMany({ where: { memberId: member.id } });
      await transaction.memberRole.create({
        data: {
          memberId: member.id,
          roleId: invitation.roleId,
          assignedBy: invitation.invitedByUserId,
        },
      });
      await transaction.businessInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedByUserId: userId, acceptedAt: now },
      });
      await transaction.user.update({
        where: { id: userId },
        data: { lastActiveBusinessId: invitation.businessId },
      });
    });
    await this.audit.write({
      actorUserId: userId,
      businessId: invitation.businessId,
      action: 'INVITATION_ACCEPTED',
      resourceType: 'BusinessInvitation',
      resourceId: invitation.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return { message: `You joined ${invitation.business.name}.` };
  }

  public async listRoles(context: BusinessAuthorizationContext): Promise<BusinessRoleDto[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        deletedAt: null,
        OR: [{ businessId: null }, { businessId: context.businessId }],
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { memberRoles: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isProtected: role.isProtected,
      permissions: role.permissions.map((assignment) => assignment.permission.key),
      memberCount: role._count.memberRoles,
    }));
  }

  public async createRole(
    context: BusinessAuthorizationContext,
    input: { name: string; description?: string; permissions: string[] },
    metadata: RequestMetadata,
  ): Promise<BusinessRoleDto> {
    this.assertGrantablePermissions(context, input.permissions);
    const permissionRows = await this.prisma.permission.findMany({
      where: { key: { in: input.permissions } },
    });
    if (permissionRows.length !== new Set(input.permissions).size) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'One or more selected permissions are unavailable.',
        statusCode: 400,
      });
    }
    const key = `custom:${context.businessId}:${slugifyBusinessName(input.name)}:${randomUUID().slice(0, 8)}`;
    const role = await this.prisma.role.create({
      data: {
        businessId: context.businessId,
        key,
        name: input.name,
        description: input.description ?? null,
        permissions: {
          create: permissionRows.map((permission) => ({ permissionId: permission.id })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { memberRoles: true } },
      },
    });
    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'CUSTOM_ROLE_CREATED',
      resourceType: 'Role',
      resourceId: role.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { permissionCount: permissionRows.length },
    });
    return mapRole(role);
  }

  public async updateRole(
    context: BusinessAuthorizationContext,
    roleId: string,
    input: { name: string; description?: string; permissions: string[] },
    metadata: RequestMetadata,
  ): Promise<BusinessRoleDto> {
    this.assertGrantablePermissions(context, input.permissions);
    const existing = await this.prisma.role.findFirst({
      where: { id: roleId, businessId: context.businessId, deletedAt: null },
    });
    if (!existing || existing.isSystem || existing.isProtected) {
      throw new AppError({
        code: 'BUSINESS_PERMISSION_DENIED',
        message: 'This role cannot be changed.',
        statusCode: 403,
      });
    }
    const permissionRows = await this.prisma.permission.findMany({
      where: { key: { in: input.permissions } },
    });
    if (permissionRows.length !== new Set(input.permissions).size) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'One or more selected permissions are unavailable.',
        statusCode: 400,
      });
    }
    const role = await this.prisma.$transaction(async (transaction) => {
      await transaction.rolePermission.deleteMany({ where: { roleId } });
      return transaction.role.update({
        where: { id: roleId },
        data: {
          name: input.name,
          description: input.description ?? null,
          permissions: {
            create: permissionRows.map((permission) => ({ permissionId: permission.id })),
          },
        },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { memberRoles: true } },
        },
      });
    });
    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'CUSTOM_ROLE_UPDATED',
      resourceType: 'Role',
      resourceId: role.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { permissionCount: permissionRows.length },
    });
    return mapRole(role);
  }

  public async deleteRole(
    context: BusinessAuthorizationContext,
    roleId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, businessId: context.businessId, deletedAt: null },
      include: { _count: { select: { memberRoles: true, invitations: true } } },
    });
    if (!role || role.isSystem || role.isProtected) {
      throw new AppError({
        code: 'BUSINESS_PERMISSION_DENIED',
        message: 'This role cannot be deleted.',
        statusCode: 403,
      });
    }
    if (role._count.memberRoles > 0 || role._count.invitations > 0) {
      throw new AppError({
        code: 'CONFLICT',
        message: 'Reassign members and pending invitations before deleting this role.',
        statusCode: 409,
      });
    }
    await this.prisma.role.update({ where: { id: role.id }, data: { deletedAt: new Date() } });
    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'CUSTOM_ROLE_DELETED',
      resourceType: 'Role',
      resourceId: role.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  public async assignRoles(
    context: BusinessAuthorizationContext,
    memberId: string,
    roleIds: string[],
    metadata: RequestMetadata,
  ): Promise<void> {
    const target = await this.prisma.businessMember.findFirst({
      where: { id: memberId, businessId: context.businessId, status: { not: 'REMOVED' } },
      include: { role: true, roles: { include: { role: true } } },
    });
    if (!target) throw new NotFoundError('The business member was not found.');
    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: roleIds },
        deletedAt: null,
        OR: [{ businessId: null }, { businessId: context.businessId }],
      },
      include: { permissions: { include: { permission: true } } },
    });
    if (roles.length !== new Set(roleIds).size) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'One or more selected roles are unavailable.',
        statusCode: 400,
      });
    }
    this.assertGrantablePermissions(
      context,
      roles.flatMap((role) => role.permissions.map((item) => item.permission.key)),
    );
    const targetIsOwner =
      target.role.key === DEFAULT_ROLE_KEYS.BUSINESS_OWNER ||
      target.roles.some((assignment) => assignment.role.key === DEFAULT_ROLE_KEYS.BUSINESS_OWNER);
    const retainsOwner = roles.some((role) => role.key === DEFAULT_ROLE_KEYS.BUSINESS_OWNER);
    if (targetIsOwner && !retainsOwner)
      await this.assertNotLastOwner(context.businessId, target.id);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.memberRole.deleteMany({ where: { memberId: target.id } });
      await transaction.memberRole.createMany({
        data: roleIds.map((roleId) => ({
          memberId: target.id,
          roleId,
          assignedBy: context.userId,
        })),
      });
      await transaction.businessMember.update({
        where: { id: target.id },
        data: { roleId: roleIds[0] ?? target.roleId },
      });
    });
    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action: 'MEMBER_ROLE_CHANGED',
      resourceType: 'BusinessMember',
      resourceId: target.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { roleCount: roleIds.length },
    });
  }

  public async setMemberStatus(
    context: BusinessAuthorizationContext,
    memberId: string,
    action: 'suspend' | 'restore' | 'remove',
    metadata: RequestMetadata,
  ): Promise<void> {
    const member = await this.prisma.businessMember.findFirst({
      where: { id: memberId, businessId: context.businessId },
      include: { role: true, roles: { include: { role: true } } },
    });
    if (!member) throw new NotFoundError('The business member was not found.');
    if (member.userId === context.userId && action === 'remove') {
      throw new AppError({
        code: 'BUSINESS_LAST_OWNER_REQUIRED',
        message: 'You cannot remove your own active membership from this action.',
        statusCode: 409,
      });
    }
    const isOwner =
      member.role.key === DEFAULT_ROLE_KEYS.BUSINESS_OWNER ||
      member.roles.some((assignment) => assignment.role.key === DEFAULT_ROLE_KEYS.BUSINESS_OWNER);
    if (isOwner && action !== 'restore')
      await this.assertNotLastOwner(context.businessId, member.id);
    const now = new Date();
    await this.prisma.businessMember.update({
      where: { id: member.id },
      data:
        action === 'suspend'
          ? { status: 'SUSPENDED', suspendedAt: now }
          : action === 'restore'
            ? { status: 'ACTIVE', suspendedAt: null, removedAt: null, deletedAt: null }
            : { status: 'REMOVED', removedAt: now, deletedAt: now },
    });
    await this.audit.write({
      actorUserId: context.userId,
      businessId: context.businessId,
      action:
        action === 'suspend'
          ? 'MEMBER_SUSPENDED'
          : action === 'restore'
            ? 'MEMBER_RESTORED'
            : 'MEMBER_REMOVED',
      resourceType: 'BusinessMember',
      resourceId: member.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  private async authorizableRole(context: BusinessAuthorizationContext, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        deletedAt: null,
        OR: [{ businessId: null }, { businessId: context.businessId }],
      },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundError('The selected role was not found.');
    this.assertGrantablePermissions(
      context,
      role.permissions.map((assignment) => assignment.permission.key),
    );
    return role;
  }

  private assertGrantablePermissions(
    context: BusinessAuthorizationContext,
    permissions: string[],
  ): void {
    if (context.isOwner) return;
    const ungrantable = permissions.find(
      (permission) => !context.permissions.has(permission as BusinessPermission),
    );
    if (ungrantable) {
      throw new AppError({
        code: 'BUSINESS_PERMISSION_DENIED',
        message: 'You cannot grant permissions that you do not hold.',
        statusCode: 403,
      });
    }
  }

  private async assertNotLastOwner(businessId: string, excludedMemberId: string): Promise<void> {
    const otherOwners = await this.prisma.businessMember.count({
      where: {
        businessId,
        id: { not: excludedMemberId },
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { role: { key: DEFAULT_ROLE_KEYS.BUSINESS_OWNER } },
          { roles: { some: { role: { key: DEFAULT_ROLE_KEYS.BUSINESS_OWNER } } } },
        ],
      },
    });
    if (otherOwners === 0) {
      throw new AppError({
        code: 'BUSINESS_LAST_OWNER_REQUIRED',
        message: 'A business must retain at least one active owner.',
        statusCode: 409,
      });
    }
  }
}

function mapInvitation(invitation: {
  id: string;
  email: string;
  role: { id: string; name: string };
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: Date;
  createdAt: Date;
}): BusinessInvitationDto {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}

function mapRole(role: {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isProtected: boolean;
  permissions: Array<{ permission: { key: string } }>;
  _count: { memberRoles: number };
}): BusinessRoleDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isProtected: role.isProtected,
    permissions: role.permissions.map((assignment) => assignment.permission.key),
    memberCount: role._count.memberRoles,
  };
}
