import 'dotenv/config';

import { createHmac, randomBytes } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';

import { PrismaClient } from '../apps/api/src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to seed development data.');
if (process.env.NODE_ENV === 'production') {
  throw new Error('The development seed must never run in production.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const generatedPassword = `Dev-${randomBytes(18).toString('base64url')}!`;
const developmentPassword = process.env.DEV_SEED_PASSWORD || generatedPassword;
const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || developmentPassword;
const reviewerPassword = process.env.PLATFORM_REVIEWER_PASSWORD || developmentPassword;
const tokenPepper =
  process.env.AUTH_REFRESH_TOKEN_SECRET || 'development-seed-token-pepper-change-before-production';

const businessPermissions = [
  ['business.view', 'View business profile and verification state'],
  ['business.update', 'Update business profile'],
  ['business.settings.manage', 'Manage business settings'],
  ['business.subscription.view', 'View the business subscription'],
  ['business.subscription.manage', 'Manage the business subscription'],
  ['members.view', 'View business members and invitations'],
  ['members.invite', 'Invite business employees'],
  ['members.update', 'Update business members'],
  ['members.suspend', 'Suspend business members'],
  ['members.remove', 'Remove business members'],
  ['roles.view', 'View business roles'],
  ['roles.create', 'Create custom roles'],
  ['roles.update', 'Update custom roles'],
  ['roles.delete', 'Delete unused custom roles'],
  ['roles.assign', 'Assign roles to members'],
  ['warranties.view', 'View warranty records'],
  ['warranties.create', 'Create warranty records'],
  ['warranties.update', 'Update warranty records'],
  ['warranties.revoke', 'Revoke warranty records'],
  ['claims.view', 'View warranty claims'],
  ['claims.review', 'Review warranty claims'],
  ['claims.update', 'Update warranty claims'],
  ['claims.assign', 'Assign warranty claims'],
  ['service_centers.view', 'View service centers'],
  ['service_centers.manage', 'Manage service centers'],
  ['recalls.view', 'View recall notices'],
  ['recalls.manage', 'Manage recall notices'],
  ['audit_logs.view', 'View business audit logs'],
] as const;

const platformPermissions = [
  ['platform.dashboard.view', 'View the platform administration dashboard'],
  ['platform.users.view', 'Look up platform users'],
  ['platform.businesses.view', 'View business applications'],
  ['platform.businesses.review', 'Review and claim business applications'],
  ['platform.businesses.verify', 'Approve business applications'],
  ['platform.businesses.reject', 'Reject business applications'],
  ['platform.businesses.suspend', 'Suspend and restore businesses'],
  ['platform.audit_logs.view', 'View security audit events'],
  ['platform.admins.manage', 'Manage platform administrator access'],
] as const;

async function main(): Promise<void> {
  const passwordHashes = {
    development: await argon2.hash(developmentPassword, { type: argon2.argon2id }),
    admin: await argon2.hash(adminPassword, { type: argon2.argon2id }),
    reviewer: await argon2.hash(reviewerPassword, { type: argon2.argon2id }),
  };
  const permissionRows = await Promise.all(
    businessPermissions.map(([key, description]) =>
      prisma.permission.upsert({
        where: { key },
        update: { description },
        create: { key, description },
      }),
    ),
  );
  const permissionByKey = new Map(permissionRows.map((permission) => [permission.key, permission]));

  const roleDefinitions = [
    {
      key: 'system:business-owner',
      name: 'Business Owner',
      description: 'Protected owner authority with every business permission.',
      permissions: businessPermissions.map(([key]) => key),
      protected: true,
    },
    {
      key: 'system:business-admin',
      name: 'Admin',
      description: 'Manages business settings, people, and operational access.',
      permissions: businessPermissions
        .map(([key]) => key)
        .filter((key) => !key.includes('subscription.manage')),
      protected: true,
    },
    {
      key: 'system:manager',
      name: 'Manager',
      description: 'Coordinates warranties, claims, and team activity.',
      permissions: [
        'business.view',
        'members.view',
        'members.invite',
        'members.update',
        'roles.view',
        'roles.assign',
        'warranties.view',
        'warranties.create',
        'warranties.update',
        'claims.view',
        'claims.review',
        'claims.update',
        'claims.assign',
      ],
      protected: true,
    },
    {
      key: 'system:warranty-officer',
      name: 'Warranty Officer',
      description: 'Creates and maintains warranty records.',
      permissions: ['business.view', 'warranties.view', 'warranties.create', 'warranties.update'],
      protected: true,
    },
    {
      key: 'system:support-agent',
      name: 'Customer Support Agent',
      description: 'Views warranties and supports warranty claims.',
      permissions: ['business.view', 'warranties.view', 'claims.view', 'claims.update'],
      protected: true,
    },
    {
      key: 'system:service-center-agent',
      name: 'Service Center Agent',
      description: 'Works with claims and service-center records.',
      permissions: ['business.view', 'claims.view', 'claims.update', 'service_centers.view'],
      protected: true,
    },
    {
      key: 'system:technician',
      name: 'Technician',
      description: 'Views assigned service and claim information.',
      permissions: ['business.view', 'claims.view', 'service_centers.view'],
      protected: true,
    },
    {
      key: 'system:read-only',
      name: 'Read-only Employee',
      description: 'Reads permitted business records without changing them.',
      permissions: [
        'business.view',
        'members.view',
        'roles.view',
        'warranties.view',
        'claims.view',
        'service_centers.view',
        'recalls.view',
      ],
      protected: true,
    },
  ] as const;

  const roles = new Map<string, { id: string }>();
  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { key: definition.key },
      update: {
        name: definition.name,
        description: definition.description,
        isSystem: true,
        isProtected: definition.protected,
        deletedAt: null,
      },
      create: {
        key: definition.key,
        name: definition.name,
        description: definition.description,
        isSystem: true,
        isProtected: definition.protected,
      },
    });
    roles.set(definition.key, role);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: definition.permissions.map((key) => ({
        roleId: role.id,
        permissionId: requiredMapValue(permissionByKey, key).id,
      })),
    });
  }

  const platformPermissionRows = await Promise.all(
    platformPermissions.map(([key, description]) =>
      prisma.platformPermission.upsert({
        where: { key },
        update: { description },
        create: { key, description },
      }),
    ),
  );
  const platformPermissionByKey = new Map(
    platformPermissionRows.map((permission) => [permission.key, permission]),
  );
  const platformRoleDefinitions = [
    {
      key: 'platform:super-admin',
      name: 'Platform Super Admin',
      permissions: platformPermissions.map(([key]) => key),
    },
    {
      key: 'platform:verification-reviewer',
      name: 'Business Verification Reviewer',
      permissions: [
        'platform.dashboard.view',
        'platform.businesses.view',
        'platform.businesses.review',
        'platform.businesses.verify',
        'platform.businesses.reject',
        'platform.businesses.suspend',
        'platform.audit_logs.view',
      ],
    },
    {
      key: 'platform:support',
      name: 'Platform Support',
      permissions: ['platform.dashboard.view', 'platform.users.view', 'platform.businesses.view'],
    },
    {
      key: 'platform:read-only-auditor',
      name: 'Platform Read-only Auditor',
      permissions: [
        'platform.dashboard.view',
        'platform.businesses.view',
        'platform.audit_logs.view',
      ],
    },
  ] as const;
  const platformRoles = new Map<string, { id: string }>();
  for (const definition of platformRoleDefinitions) {
    const role = await prisma.platformRole.upsert({
      where: { key: definition.key },
      update: { name: definition.name },
      create: { key: definition.key, name: definition.name, isProtected: true },
    });
    platformRoles.set(definition.key, role);
    await prisma.platformRolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.platformRolePermission.createMany({
      data: definition.permissions.map((key) => ({
        roleId: role.id,
        permissionId: requiredMapValue(platformPermissionByKey, key).id,
      })),
    });
  }

  const now = new Date();
  const users = {
    customer: await upsertUser(
      'dev.customer@warrantypass.local',
      'Development Verified Customer',
      passwordHashes.development,
      true,
    ),
    unverified: await upsertUser(
      'dev.unverified@warrantypass.local',
      'Development Unverified Customer',
      passwordHashes.development,
      false,
    ),
    expiredCustomer: await upsertUser(
      'dev.expired-customer@warrantypass.local',
      'Development Expired Vault Customer',
      passwordHashes.development,
      true,
    ),
    owner: await upsertUser(
      'dev.owner@warrantypass.local',
      'Development Business Owner',
      passwordHashes.development,
      true,
    ),
    manager: await upsertUser(
      'dev.manager@warrantypass.local',
      'Development Business Manager',
      passwordHashes.development,
      true,
    ),
    support: await upsertUser(
      'dev.support@warrantypass.local',
      'Development Support Employee',
      passwordHashes.development,
      true,
    ),
    pendingOwner: await upsertUser(
      'dev.pending-owner@warrantypass.local',
      'Development Pending Business Owner',
      passwordHashes.development,
      true,
    ),
    suspendedOwner: await upsertUser(
      'dev.suspended-owner@warrantypass.local',
      'Development Suspended Business Owner',
      passwordHashes.development,
      true,
    ),
    admin: await upsertUser(
      process.env.PLATFORM_ADMIN_EMAIL || 'dev.admin@warrantypass.local',
      'Development Platform Super Admin',
      passwordHashes.admin,
      true,
      'PLATFORM_ADMIN',
    ),
    reviewer: await upsertUser(
      process.env.PLATFORM_REVIEWER_EMAIL || 'dev.reviewer@warrantypass.local',
      'Development Verification Reviewer',
      passwordHashes.reviewer,
      true,
      'PLATFORM_ADMIN',
    ),
  };

  await prisma.userPlatformRole.upsert({
    where: {
      userId_roleId: {
        userId: users.admin.id,
        roleId: requiredMapValue(platformRoles, 'platform:super-admin').id,
      },
    },
    update: { status: 'ACTIVE' },
    create: {
      userId: users.admin.id,
      roleId: requiredMapValue(platformRoles, 'platform:super-admin').id,
    },
  });
  await prisma.userPlatformRole.upsert({
    where: {
      userId_roleId: {
        userId: users.reviewer.id,
        roleId: requiredMapValue(platformRoles, 'platform:verification-reviewer').id,
      },
    },
    update: { status: 'ACTIVE' },
    create: {
      userId: users.reviewer.id,
      roleId: requiredMapValue(platformRoles, 'platform:verification-reviewer').id,
    },
  });

  const businesses = {
    verified: await upsertBusiness({
      slug: 'dev-dhaka-appliances',
      name: 'DEV — Dhaka Appliances',
      email: 'dev.verified-business@warrantypass.local',
      registrationNumber: 'DEV-TL-0001',
      status: 'VERIFIED',
      verifiedAt: new Date('2026-01-10T00:00:00.000Z'),
      verifiedByUserId: users.reviewer.id,
    }),
    pending: await upsertBusiness({
      slug: 'dev-pending-electronics',
      name: 'DEV — Pending Electronics',
      email: 'dev.pending-business@warrantypass.local',
      registrationNumber: 'DEV-TL-0002',
      status: 'PENDING',
    }),
    suspended: await upsertBusiness({
      slug: 'dev-suspended-mobiles',
      name: 'DEV — Suspended Mobiles',
      email: 'dev.suspended-business@warrantypass.local',
      registrationNumber: 'DEV-TL-0003',
      status: 'SUSPENDED',
      verifiedAt: new Date('2026-01-05T00:00:00.000Z'),
      verifiedByUserId: users.reviewer.id,
    }),
  };

  const ownerRoleId = requiredMapValue(roles, 'system:business-owner').id;
  await upsertMembership(businesses.verified.id, users.owner.id, ownerRoleId);
  await upsertMembership(
    businesses.verified.id,
    users.manager.id,
    requiredMapValue(roles, 'system:manager').id,
  );
  await upsertMembership(
    businesses.verified.id,
    users.support.id,
    requiredMapValue(roles, 'system:support-agent').id,
  );
  await upsertMembership(businesses.pending.id, users.pendingOwner.id, ownerRoleId);
  await upsertMembership(businesses.suspended.id, users.suspendedOwner.id, ownerRoleId);

  const customRole = await prisma.role.upsert({
    where: { key: `custom:${businesses.verified.id}:returns-coordinator` },
    update: { deletedAt: null },
    create: {
      businessId: businesses.verified.id,
      key: `custom:${businesses.verified.id}:returns-coordinator`,
      name: 'Returns Coordinator',
      description: 'Development-only custom role for claims intake.',
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: customRole.id } });
  await prisma.rolePermission.createMany({
    data: ['business.view', 'warranties.view', 'claims.view', 'claims.update'].map((key) => ({
      roleId: customRole.id,
      permissionId: requiredMapValue(permissionByKey, key).id,
    })),
  });

  await seedVerificationRevision(businesses.pending.id, users.pendingOwner.id);
  await seedVerificationRevision(businesses.verified.id, users.owner.id);
  await seedVerificationRevision(businesses.suspended.id, users.suspendedOwner.id);

  const invitationToken = randomBytes(48).toString('base64url');
  const invitationHash = createHmac('sha256', tokenPepper).update(invitationToken).digest('hex');
  const existingInvitation = await prisma.businessInvitation.findFirst({
    where: {
      businessId: businesses.verified.id,
      email: 'dev.invited@warrantypass.local',
      status: 'PENDING',
    },
  });
  if (existingInvitation) {
    await prisma.businessInvitation.update({
      where: { id: existingInvitation.id },
      data: {
        tokenHash: invitationHash,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        roleId: customRole.id,
      },
    });
  } else {
    await prisma.businessInvitation.create({
      data: {
        businessId: businesses.verified.id,
        roleId: customRole.id,
        invitedByUserId: users.owner.id,
        email: 'dev.invited@warrantypass.local',
        tokenHash: invitationHash,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        personalMessage: 'Development-only invitation for Part 2 testing.',
      },
    });
  }

  await seedWarrantyData(users.customer.id, businesses.verified.id);
  await seedCustomerWalletData(users.customer.id, users.expiredCustomer.id, businesses.verified.id);
  if (
    !(await prisma.auditLog.findFirst({
      where: { action: 'DEV_SEED_CREATED', resourceId: businesses.verified.id },
    }))
  ) {
    await prisma.auditLog.create({
      data: {
        actorUserId: users.admin.id,
        businessId: businesses.verified.id,
        action: 'DEV_SEED_CREATED',
        resourceType: 'Business',
        resourceId: businesses.verified.id,
        metadata: { developmentOnly: true },
      },
    });
  }

  console.log('\nWarrantyPass development seed completed.');
  console.log('These credentials are local development data only:');
  console.log(`Shared customer/business password: ${developmentPassword}`);
  console.log(`Platform admin: ${users.admin.email} / ${adminPassword}`);
  console.log(`Verification reviewer: ${users.reviewer.email} / ${reviewerPassword}`);
  console.log(`Pending invitation token: ${invitationToken}`);
  if (!process.env.DEV_SEED_PASSWORD) {
    console.log('Passwords were generated for this seed run and will change on the next seed run.');
  }
}

async function upsertUser(
  email: string,
  displayName: string,
  passwordHash: string,
  verified: boolean,
  kind: 'CUSTOMER' | 'PLATFORM_ADMIN' = 'CUSTOMER',
) {
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      passwordHash,
      kind,
      status: verified ? 'ACTIVE' : 'PENDING',
      emailVerifiedAt: verified ? new Date('2026-01-01T00:00:00.000Z') : null,
      deletedAt: null,
      profile: {
        upsert: {
          create: { displayName },
          update: { displayName },
        },
      },
    },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      kind,
      status: verified ? 'ACTIVE' : 'PENDING',
      emailVerifiedAt: verified ? new Date('2026-01-01T00:00:00.000Z') : null,
      passwordChangedAt: new Date('2026-01-01T00:00:00.000Z'),
      profile: { create: { displayName } },
      termsAcceptances: {
        create: {
          termsVersion: '2026-08-01',
          privacyVersion: '2026-08-01',
          termsAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
          privacyAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      },
    },
  });
}

async function upsertBusiness(input: {
  slug: string;
  name: string;
  email: string;
  registrationNumber: string;
  status: 'PENDING' | 'VERIFIED' | 'SUSPENDED';
  verifiedAt?: Date;
  verifiedByUserId?: string;
}) {
  return prisma.business.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      legalName: input.name,
      status: input.status,
      verifiedAt: input.verifiedAt ?? null,
      verifiedByUserId: input.verifiedByUserId ?? null,
      verificationReference: `DEV-${input.registrationNumber}`,
      deletedAt: null,
    },
    create: {
      name: input.name,
      legalName: input.name,
      slug: input.slug,
      email: input.email,
      phone: '+8801700000000',
      businessType: 'Retailer',
      registrationType: 'TRADE_LICENSE',
      registrationNumber: input.registrationNumber,
      registrationNumberNormalized: input.registrationNumber.replaceAll('-', ''),
      addressLine: 'Development Road 1',
      area: 'Dhanmondi',
      district: 'Dhaka',
      division: 'Dhaka',
      status: input.status,
      verifiedAt: input.verifiedAt ?? null,
      verifiedByUserId: input.verifiedByUserId ?? null,
      verificationReference: `DEV-${input.registrationNumber}`,
    },
  });
}

async function upsertMembership(businessId: string, userId: string, roleId: string): Promise<void> {
  const member = await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId, userId } },
    update: {
      roleId,
      status: 'ACTIVE',
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      suspendedAt: null,
      removedAt: null,
      deletedAt: null,
    },
    create: {
      businessId,
      userId,
      roleId,
      status: 'ACTIVE',
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
  await prisma.memberRole.upsert({
    where: { memberId_roleId: { memberId: member.id, roleId } },
    update: {},
    create: { memberId: member.id, roleId },
  });
}

async function seedVerificationRevision(
  businessId: string,
  submittedByUserId: string,
): Promise<void> {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  await prisma.businessVerificationRevision.upsert({
    where: { businessId_version: { businessId, version: 1 } },
    update: {},
    create: {
      businessId,
      submittedByUserId,
      version: 1,
      status: 'SUBMITTED',
      ownerFullName: 'Development Business Owner',
      legalName: business.legalName ?? business.name,
      displayName: business.name,
      businessType: business.businessType ?? 'Retailer',
      tradeLicenseNumber: business.registrationNumber,
      tradeLicenseNumberNormalized:
        business.registrationNumberNormalized ?? business.registrationNumber,
      phone: business.phone ?? '+8801700000000',
      businessEmail: business.email,
      addressLine: business.addressLine ?? 'Development Road 1',
      area: business.area ?? 'Dhanmondi',
      district: business.district ?? 'Dhaka',
      division: business.division ?? 'Dhaka',
      submittedAt: new Date('2026-01-02T00:00:00.000Z'),
    },
  });
  if (
    !(await prisma.businessVerificationStatusHistory.findFirst({
      where: { businessId, newStatus: business.status },
    }))
  ) {
    await prisma.businessVerificationStatusHistory.create({
      data: { businessId, newStatus: business.status },
    });
  }
  if (business.status === 'PENDING') {
    const existing = await prisma.businessVerification.findFirst({ where: { businessId } });
    if (!existing) {
      await prisma.businessVerification.create({
        data: {
          businessId,
          submittedByUserId,
          status: 'PENDING',
          referenceNumber: business.verificationReference,
          submittedNotes: 'Development-only pending review.',
        },
      });
    }
  }
}

async function seedWarrantyData(customerId: string, businessId: string): Promise<void> {
  const businessProduct = await prisma.product.upsert({
    where: { id: '10000000-0000-4000-8000-000000000001' },
    update: { businessId, ownerUserId: null },
    create: {
      id: '10000000-0000-4000-8000-000000000001',
      businessId,
      name: 'Inverter Refrigerator 260L',
      brand: 'DEV Home',
      modelNumber: 'DH-INV-260',
      category: 'Home Appliance',
    },
  });
  const manualProduct = await prisma.product.upsert({
    where: { id: '10000000-0000-4000-8000-000000000002' },
    update: { ownerUserId: customerId, businessId: null },
    create: {
      id: '10000000-0000-4000-8000-000000000002',
      ownerUserId: customerId,
      name: 'Wireless Headphones',
      brand: 'Example Audio',
      modelNumber: 'EA-100',
      category: 'Consumer Electronics',
    },
  });
  await prisma.warranty.upsert({
    where: { verificationCode: 'DEV-WP-VERIFIED-001' },
    update: {
      customerUserId: customerId,
      productId: businessProduct.id,
      issuerBusinessId: businessId,
    },
    create: {
      customerUserId: customerId,
      productId: businessProduct.id,
      issuerBusinessId: businessId,
      source: 'BUSINESS_ISSUED',
      status: 'ACTIVE',
      verificationLabel: 'VERIFIED_BY_BUSINESS',
      verificationCode: 'DEV-WP-VERIFIED-001',
      serialNumber: 'DEV-SERIAL-001',
      issueDate: new Date('2026-01-15T00:00:00.000Z'),
      expiresAt: new Date('2028-01-15T00:00:00.000Z'),
    },
  });
  if (
    !(await prisma.warranty.findFirst({
      where: { customerUserId: customerId, productId: manualProduct.id, source: 'USER_UPLOADED' },
    }))
  ) {
    await prisma.warranty.create({
      data: {
        customerUserId: customerId,
        productId: manualProduct.id,
        source: 'USER_UPLOADED',
        status: 'ACTIVE',
        verificationLabel: 'USER_UPLOADED',
        issueDate: new Date('2026-02-01T00:00:00.000Z'),
        expiresAt: new Date('2027-02-01T00:00:00.000Z'),
      },
    });
  }
}

async function seedCustomerWalletData(
  customerId: string,
  expiredCustomerId: string,
  businessId: string,
): Promise<void> {
  const brand = await prisma.productBrand.upsert({
    where: { slug: 'dev-home' },
    update: { name: 'DEV Home', deletedAt: null },
    create: { slug: 'dev-home', name: 'DEV Home' },
  });
  const category = await prisma.productCategory.upsert({
    where: { slug: 'home-appliances' },
    update: { name: 'Home Appliances', deletedAt: null },
    create: { slug: 'home-appliances', name: 'Home Appliances' },
  });
  const electronics = await prisma.productCategory.upsert({
    where: { slug: 'consumer-electronics' },
    update: { name: 'Consumer Electronics', deletedAt: null },
    create: { slug: 'consumer-electronics', name: 'Consumer Electronics' },
  });
  await prisma.productBrand.upsert({
    where: { slug: 'example-audio' },
    update: { name: 'Example Audio', deletedAt: null },
    create: { slug: 'example-audio', name: 'Example Audio' },
  });
  const catalogProduct = await prisma.catalogProduct.upsert({
    where: {
      businessId_modelNumber: { businessId, modelNumber: 'DH-INV-260' },
    },
    update: { brandId: brand.id, categoryId: category.id, deletedAt: null },
    create: {
      businessId,
      brandId: brand.id,
      categoryId: category.id,
      name: 'Inverter Refrigerator 260L',
      modelNumber: 'DH-INV-260',
      description: 'Development-only catalog product.',
    },
  });
  const businessCustomerProduct = await prisma.customerProduct.upsert({
    where: { id: '20000000-0000-4000-8000-000000000001' },
    update: { customerUserId: customerId, deletedAt: null, ownershipStatus: 'ACTIVE' },
    create: {
      id: '20000000-0000-4000-8000-000000000001',
      customerUserId: customerId,
      catalogProductId: catalogProduct.id,
      brandId: brand.id,
      categoryId: category.id,
      productName: catalogProduct.name,
      modelNumber: catalogProduct.modelNumber,
      serialNumber: 'DEV-BUSINESS-SERIAL-260-001',
      purchaseDate: new Date('2026-01-15T00:00:00.000Z'),
      sellerName: 'DEV — Dhaka Appliances',
      sourceType: 'BUSINESS_ISSUED',
    },
  });
  await prisma.warranty.upsert({
    where: { id: '30000000-0000-4000-8000-000000000001' },
    update: { customerUserId: customerId, customerProductId: businessCustomerProduct.id },
    create: {
      id: '30000000-0000-4000-8000-000000000001',
      customerUserId: customerId,
      customerProductId: businessCustomerProduct.id,
      issuerBusinessId: businessId,
      source: 'BUSINESS_ISSUED',
      verificationLabel: 'VERIFIED_BY_BUSINESS',
      status: 'ACTIVE',
      warrantyNumber: 'DEV-WARRANTY-260-001',
      serialNumber: 'DEV-BUSINESS-SERIAL-260-001',
      purchaseDate: new Date('2026-01-15T00:00:00.000Z'),
      issueDate: new Date('2026-01-15T00:00:00.000Z'),
      startDate: new Date('2026-01-15T00:00:00.000Z'),
      endDate: new Date('2028-01-15T00:00:00.000Z'),
      durationValue: 2,
      durationUnit: 'YEARS',
      coverageType: 'MANUFACTURER',
      termsSummary: 'Development-only manufacturer warranty for parts and service.',
    },
  });
  const manualProduct = await prisma.customerProduct.upsert({
    where: { id: '20000000-0000-4000-8000-000000000002' },
    update: { customerUserId: customerId, deletedAt: null, ownershipStatus: 'ACTIVE' },
    create: {
      id: '20000000-0000-4000-8000-000000000002',
      customerUserId: customerId,
      categoryId: electronics.id,
      productName: 'Wireless Headphones',
      modelNumber: 'EA-100',
      serialNumber: 'DEV-MANUAL-SERIAL-100-002',
      purchaseDate: new Date('2026-02-01T00:00:00.000Z'),
      sellerName: 'Example Electronics',
      sourceType: 'USER_UPLOADED',
      notes: 'Development-only manual warranty record.',
    },
  });
  await prisma.warranty.upsert({
    where: { id: '30000000-0000-4000-8000-000000000002' },
    update: { customerUserId: customerId, customerProductId: manualProduct.id },
    create: {
      id: '30000000-0000-4000-8000-000000000002',
      customerUserId: customerId,
      customerProductId: manualProduct.id,
      source: 'USER_UPLOADED',
      verificationLabel: 'USER_UPLOADED',
      status: 'ACTIVE',
      serialNumber: 'DEV-MANUAL-SERIAL-100-002',
      purchaseDate: new Date('2026-02-01T00:00:00.000Z'),
      issueDate: new Date('2026-02-01T00:00:00.000Z'),
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2027-02-01T00:00:00.000Z'),
      durationValue: 1,
      durationUnit: 'YEARS',
      coverageType: 'SELLER',
    },
  });
  const plan = await prisma.subscriptionPlan.upsert({
    where: { key: 'manual-vault-annual' },
    update: { isActive: true },
    create: {
      key: 'manual-vault-annual',
      name: 'Manual Warranty Vault Annual',
      description: 'Create manual warranty records and securely attach private documents.',
      amount: 1200,
      currency: 'BDT',
      interval: 'YEARLY',
    },
  });
  const activeSubscription = await prisma.subscription.upsert({
    where: { providerSubscriptionId: `dev_active_${customerId}` },
    update: { status: 'ACTIVE', planId: plan.id, cancelAtPeriodEnd: false },
    create: {
      ownerType: 'USER',
      userId: customerId,
      planKey: plan.key,
      planId: plan.id,
      status: 'ACTIVE',
      billingInterval: 'YEARLY',
      providerSubscriptionId: `dev_active_${customerId}`,
      currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z'),
    },
  });
  await prisma.payment.upsert({
    where: { idempotencyKey: `dev-seed:${activeSubscription.id}` },
    update: { status: 'SUCCEEDED' },
    create: {
      subscriptionId: activeSubscription.id,
      providerPaymentId: `dev_payment_${activeSubscription.id}`,
      paymentReference: `DEV-PAY-${activeSubscription.id}`,
      idempotencyKey: `dev-seed:${activeSubscription.id}`,
      amount: plan.amount,
      currency: 'BDT',
      status: 'SUCCEEDED',
      paidAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
  await prisma.subscription.upsert({
    where: { providerSubscriptionId: `dev_expired_${expiredCustomerId}` },
    update: { status: 'EXPIRED', planId: plan.id },
    create: {
      ownerType: 'USER',
      userId: expiredCustomerId,
      planKey: plan.key,
      planId: plan.id,
      status: 'EXPIRED',
      billingInterval: 'YEARLY',
      providerSubscriptionId: `dev_expired_${expiredCustomerId}`,
      currentPeriodStart: new Date('2024-01-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2025-01-01T00:00:00.000Z'),
    },
  });
  const otherCustomerProduct = await prisma.customerProduct.upsert({
    where: { id: '20000000-0000-4000-8000-000000000099' },
    update: { customerUserId: expiredCustomerId, deletedAt: null },
    create: {
      id: '20000000-0000-4000-8000-000000000099',
      customerUserId: expiredCustomerId,
      categoryId: electronics.id,
      productName: 'Expired Customer Demo Phone',
      purchaseDate: new Date('2024-01-01T00:00:00.000Z'),
      sellerName: 'Development Store',
      sourceType: 'USER_UPLOADED',
    },
  });
  await prisma.warranty.upsert({
    where: { id: '30000000-0000-4000-8000-000000000099' },
    update: { customerUserId: expiredCustomerId, customerProductId: otherCustomerProduct.id },
    create: {
      id: '30000000-0000-4000-8000-000000000099',
      customerUserId: expiredCustomerId,
      customerProductId: otherCustomerProduct.id,
      source: 'USER_UPLOADED',
      verificationLabel: 'USER_UPLOADED',
      status: 'ACTIVE',
      issueDate: new Date('2024-01-01T00:00:00.000Z'),
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2025-01-01T00:00:00.000Z'),
    },
  });
}

function requiredMapValue<T>(map: Map<string, T>, key: string): T {
  const value = map.get(key);
  if (!value) throw new Error(`Seed dependency ${key} was not created.`);
  return value;
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
