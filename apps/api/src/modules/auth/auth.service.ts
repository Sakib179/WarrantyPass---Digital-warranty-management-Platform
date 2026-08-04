import { randomUUID } from 'node:crypto';

import type {
  AuthenticationDto,
  CurrentUserDto,
  GenericMessageDto,
  RegistrationResultDto,
  SessionDto,
} from '@warrantypass/shared';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { UAParser } from 'ua-parser-js';

import type { AppConfig } from '../../config/env.js';
import { AppError, NotFoundError } from '../../common/errors/app-error.js';
import type { AuditWriter } from '../../common/security/contracts.js';
import type { PasswordHasher } from '../../common/security/password.js';
import { privacyIpHint, type RequestMetadata } from '../../common/security/request-metadata.js';
import type { TokenService } from '../../common/security/token.service.js';
import { normalizeEmail } from '../../common/utils/identifiers.js';
import {
  passwordResetEmail,
  securityNotificationEmail,
  verificationEmail,
} from '../../infrastructure/email/email-templates.js';
import type { EmailProvider } from '../../infrastructure/email/email-provider.js';

interface RegistrationInput {
  email: string;
  password: string;
  fullName?: string;
  mobileNumber?: string;
  preferredLanguage: 'en-BD' | 'bn-BD';
}

interface SessionResult {
  authentication: AuthenticationDto;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const genericRecoveryMessage =
  'If an eligible account matches that email, a recovery message will arrive shortly.';

export class AuthService {
  private readonly dummyHash: Promise<string>;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AppConfig,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordHasher,
    private readonly email: EmailProvider,
    private readonly audit: AuditWriter,
  ) {
    this.dummyHash = passwords.hash('WarrantyPass timing protection phrase');
  }

  public async registerCustomer(
    input: RegistrationInput,
    metadata: RequestMetadata,
  ): Promise<RegistrationResultDto> {
    const email = normalizeEmail(input.email);
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new AppError({
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'An account cannot be created with those details.',
        statusCode: 409,
      });
    }

    const passwordHash = await this.passwords.hash(input.password);
    const rawToken = this.tokens.createOpaqueToken();
    const tokenHash = this.tokens.hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.EMAIL_VERIFICATION_EXPIRES_IN * 1_000);

    const user = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          email,
          passwordHash,
          status: 'PENDING',
          passwordChangedAt: now,
          profile: {
            create: {
              ...(input.fullName ? { displayName: input.fullName.trim() } : {}),
              ...(input.mobileNumber ? { phone: input.mobileNumber.trim() } : {}),
              locale: input.preferredLanguage,
            },
          },
        },
      });
      await transaction.termsAcceptance.create({
        data: {
          userId: created.id,
          termsVersion: this.config.TERMS_VERSION,
          privacyVersion: this.config.PRIVACY_VERSION,
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
        },
      });
      await transaction.emailVerificationToken.create({
        data: { userId: created.id, tokenHash, expiresAt },
      });
      return created;
    });

    await this.audit.write({
      actorUserId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: user.id,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { accountKind: 'CUSTOMER' },
    });
    await this.sendVerificationEmail(email, rawToken);

    return {
      userId: user.id,
      email,
      emailVerificationRequired: true,
      message: 'Account created. Check your email to verify your WarrantyPass account.',
    };
  }

  public async verifyEmail(
    rawToken: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const tokenHash = this.tokens.hashToken(rawToken);
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !token ||
      token.consumedAt ||
      token.invalidatedAt ||
      token.expiresAt.getTime() <= Date.now()
    ) {
      throw new AppError({
        code: 'AUTH_TOKEN_INVALID',
        message: 'This verification link is invalid or has expired.',
        statusCode: 400,
      });
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { consumedAt: now },
      }),
      this.prisma.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: now, status: 'ACTIVE' },
      }),
    ]);
    await this.audit.write({
      actorUserId: token.userId,
      action: 'EMAIL_VERIFIED',
      resourceType: 'User',
      resourceId: token.userId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return { message: 'Your email is verified. You can now sign in.' };
  }

  public async resendVerification(
    inputEmail: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const email = normalizeEmail(inputEmail);
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    if (user && !user.emailVerifiedAt && user.status !== 'DEACTIVATED') {
      const rawToken = this.tokens.createOpaqueToken();
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.emailVerificationToken.updateMany({
          where: { userId: user.id, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: now },
        }),
        this.prisma.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash: this.tokens.hashToken(rawToken),
            expiresAt: new Date(now.getTime() + this.config.EMAIL_VERIFICATION_EXPIRES_IN * 1_000),
          },
        }),
      ]);
      await this.sendVerificationEmail(user.email, rawToken);
      await this.audit.write({
        actorUserId: user.id,
        action: 'EMAIL_VERIFICATION_RESENT',
        resourceType: 'User',
        resourceId: user.id,
        requestId: metadata.requestId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
    }
    return { message: 'If the account needs verification, a new message will arrive shortly.' };
  }

  public async login(
    input: { email: string; password: string; rememberMe: boolean },
    metadata: RequestMetadata,
  ): Promise<SessionResult> {
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    const validPassword = user?.passwordHash
      ? await this.passwords.verify(input.password, user.passwordHash)
      : await this.passwords.verify(input.password, await this.dummyHash);
    const emailHash = this.tokens.hashToken(email);

    if (!user || !validPassword) {
      if (user) await this.recordFailedLogin(user.id);
      await this.recordLoginAttempt({
        ...(user ? { userId: user.id } : {}),
        emailHash,
        succeeded: false,
        failureReason: 'INVALID_CREDENTIALS',
        metadata,
      });
      throw new AppError({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
        statusCode: 401,
      });
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.recordLoginAttempt({
        userId: user.id,
        emailHash,
        succeeded: false,
        failureReason: 'ACCOUNT_LOCKED',
        metadata,
      });
      throw new AppError({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
        statusCode: 401,
      });
    }
    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      throw new AppError({
        code: 'AUTH_ACCOUNT_SUSPENDED',
        message: 'This account is not currently available. Contact WarrantyPass support.',
        statusCode: 403,
      });
    }
    if (!user.emailVerifiedAt) {
      throw new AppError({
        code: 'AUTH_EMAIL_NOT_VERIFIED',
        message: 'Verify your email before signing in.',
        statusCode: 403,
      });
    }

    const result = await this.createSession(user.id, user.kind, input.rememberMe, metadata);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });
    await this.recordLoginAttempt({
      userId: user.id,
      emailHash,
      succeeded: true,
      metadata,
    });
    return result;
  }

  public async refresh(rawRefreshToken: string, metadata: RequestMetadata): Promise<SessionResult> {
    const sessionId = this.sessionIdFromRefreshToken(rawRefreshToken);
    const tokenHash = this.tokens.hashToken(rawRefreshToken);
    const existing = await this.prisma.sessionRefreshToken.findUnique({
      where: { tokenHash },
      include: { session: { include: { user: true } } },
    });
    if (!existing || existing.sessionId !== sessionId) {
      throw this.sessionError('AUTH_TOKEN_INVALID', 'The refresh session is invalid.');
    }

    const now = new Date();
    const session = existing.session;
    if (session.revokedAt) {
      throw this.sessionError('AUTH_SESSION_REVOKED', 'This session has been revoked.');
    }
    if (session.expiresAt <= now || existing.expiresAt <= now) {
      throw this.sessionError('AUTH_SESSION_EXPIRED', 'This session has expired.');
    }
    if (existing.usedAt || existing.revokedAt) {
      await this.revokeFamilyForReuse(session.familyId, session.userId, metadata);
      throw this.sessionError(
        'AUTH_SESSION_REVOKED',
        'Suspicious session reuse was detected. Sign in again.',
      );
    }

    const newRawToken = this.tokens.createRefreshToken(session.id);
    const newTokenHash = this.tokens.hashToken(newRawToken);
    try {
      await this.prisma.$transaction(async (transaction) => {
        const consumed = await transaction.sessionRefreshToken.updateMany({
          where: { id: existing.id, usedAt: null, revokedAt: null },
          data: { usedAt: now, replacedByHash: newTokenHash },
        });
        if (consumed.count !== 1) throw new Error('REFRESH_TOKEN_ALREADY_CONSUMED');
        await transaction.sessionRefreshToken.create({
          data: {
            sessionId: session.id,
            tokenHash: newTokenHash,
            expiresAt: session.expiresAt,
          },
        });
        await transaction.session.update({
          where: { id: session.id },
          data: {
            refreshTokenHash: newTokenHash,
            lastUsedAt: now,
            ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
            ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
            deviceName: metadata.deviceName,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'REFRESH_TOKEN_ALREADY_CONSUMED') {
        await this.revokeFamilyForReuse(session.familyId, session.userId, metadata);
        throw this.sessionError(
          'AUTH_SESSION_REVOKED',
          'Suspicious session reuse was detected. Sign in again.',
        );
      }
      throw error;
    }

    const access = await this.tokens.createAccessToken({
      userId: session.userId,
      sessionId: session.id,
      kind: session.user.kind,
    });
    const csrfToken = this.tokens.createOpaqueToken();
    return {
      authentication: {
        accessToken: access.token,
        accessTokenExpiresAt: access.expiresAt.toISOString(),
        csrfToken,
        user: await this.currentUser(session.userId),
        redirectTo: await this.redirectForUser(session.userId),
      },
      refreshToken: newRawToken,
      refreshExpiresAt: session.expiresAt,
    };
  }

  public async logout(sessionId: string | undefined, metadata: RequestMetadata): Promise<void> {
    if (!sessionId) return;
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.revokedAt) return;
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: now, revokedReason: 'USER_LOGOUT' },
      }),
      this.prisma.sessionRefreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.write({
      actorUserId: session.userId,
      action: 'SESSION_REVOKED',
      resourceType: 'Session',
      resourceId: sessionId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { reason: 'USER_LOGOUT' },
    });
  }

  public async logoutAll(userId: string, metadata: RequestMetadata): Promise<void> {
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'USER_LOGOUT_ALL' },
      }),
      this.prisma.sessionRefreshToken.updateMany({
        where: { session: { userId }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.write({
      actorUserId: userId,
      action: 'ALL_SESSIONS_REVOKED',
      resourceType: 'User',
      resourceId: userId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: { sessionCount: sessions.length },
    });
  }

  public async forgotPassword(
    inputEmail: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const email = normalizeEmail(inputEmail);
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    if (user?.passwordHash && user.status !== 'DEACTIVATED') {
      const rawToken = this.tokens.createOpaqueToken();
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { userId: user.id, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: now },
        }),
        this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: this.tokens.hashToken(rawToken),
            expiresAt: new Date(now.getTime() + this.config.PASSWORD_RESET_EXPIRES_IN * 1_000),
          },
        }),
      ]);
      const template = passwordResetEmail({
        resetUrl: `${this.config.WEB_URL}/reset-password?token=${encodeURIComponent(rawToken)}`,
        expiresInMinutes: Math.round(this.config.PASSWORD_RESET_EXPIRES_IN / 60),
      });
      await this.email.send({ to: user.email, ...template });
      await this.audit.write({
        actorUserId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resourceType: 'User',
        resourceId: user.id,
        requestId: metadata.requestId,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
    }
    return { message: genericRecoveryMessage };
  }

  public async resetPassword(
    rawToken: string,
    newPassword: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokens.hashToken(rawToken) },
      include: { user: true },
    });
    if (!token || token.consumedAt || token.invalidatedAt) {
      throw new AppError({
        code: 'PASSWORD_RESET_INVALID',
        message: 'This password-reset link is invalid.',
        statusCode: 400,
      });
    }
    if (token.expiresAt.getTime() <= Date.now()) {
      throw new AppError({
        code: 'PASSWORD_RESET_EXPIRED',
        message: 'This password-reset link has expired.',
        statusCode: 400,
      });
    }
    if (
      token.user.passwordHash &&
      (await this.passwords.verify(newPassword, token.user.passwordHash))
    ) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Choose a password you have not just used.',
        statusCode: 400,
      });
    }

    const now = new Date();
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { consumedAt: now },
      }),
      this.prisma.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'PASSWORD_RESET' },
      }),
      this.prisma.sessionRefreshToken.updateMany({
        where: { session: { userId: token.userId }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.write({
      actorUserId: token.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      resourceType: 'User',
      resourceId: token.userId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    const template = securityNotificationEmail({
      title: 'Your WarrantyPass password was reset',
      description: 'All previous sessions were signed out. Contact support if this was not you.',
      securityUrl: `${this.config.WEB_URL}/account/security`,
    });
    await this.email.send({ to: token.user.email, ...template });
    return { message: 'Your password was reset. Sign in with the new password.' };
  }

  public async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await this.passwords.verify(currentPassword, user.passwordHash))) {
      throw new AppError({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'The current password is incorrect.',
        statusCode: 401,
      });
    }
    if (await this.passwords.verify(newPassword, user.passwordHash)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Choose a new password.',
        statusCode: 400,
      });
    }
    const now = new Date();
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: now },
      }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'PASSWORD_CHANGED' },
      }),
      this.prisma.sessionRefreshToken.updateMany({
        where: { session: { userId, id: { not: currentSessionId } }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.write({
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      resourceType: 'User',
      resourceId: userId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return { message: 'Password changed. Other devices were signed out.' };
  }

  public currentUser(userId: string): Promise<CurrentUserDto> {
    return this.buildCurrentUser(userId);
  }

  public async listSessions(userId: string, currentSessionId: string): Promise<SessionDto[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: [{ lastUsedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return sessions.map((session) => {
      const parsed = UAParser(session.userAgent ?? '');
      return {
        id: session.id,
        deviceName: session.deviceName ?? 'Unknown device',
        browser: parsed.browser.name ?? null,
        operatingSystem: parsed.os.name ?? null,
        ipHint: session.ipAddress ? privacyIpHint(session.ipAddress) : null,
        rememberMe: session.rememberMe,
        current: session.id === currentSessionId,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
        expiresAt: session.expiresAt.toISOString(),
      };
    });
  }

  public async revokeSession(
    userId: string,
    sessionId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundError('The session was not found.');
    await this.logout(sessionId, metadata);
  }

  public async updateProfile(
    userId: string,
    input: {
      fullName?: string | null;
      mobileNumber?: string | null;
      preferredLanguage?: 'en-BD' | 'bn-BD';
    },
    metadata: RequestMetadata,
  ): Promise<CurrentUserDto> {
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...(input.fullName !== undefined ? { displayName: input.fullName } : {}),
        ...(input.mobileNumber !== undefined ? { phone: input.mobileNumber } : {}),
        ...(input.preferredLanguage ? { locale: input.preferredLanguage } : {}),
      },
      update: {
        ...(input.fullName !== undefined ? { displayName: input.fullName } : {}),
        ...(input.mobileNumber !== undefined ? { phone: input.mobileNumber } : {}),
        ...(input.preferredLanguage ? { locale: input.preferredLanguage } : {}),
      },
    });
    await this.audit.write({
      actorUserId: userId,
      action: 'PROFILE_UPDATED',
      resourceType: 'User',
      resourceId: userId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return this.currentUser(userId);
  }

  public async requestEmailChange(
    userId: string,
    newEmailInput: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const newEmail = normalizeEmail(newEmailInput);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await this.passwords.verify(password, user.passwordHash))) {
      throw new AppError({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'The password is incorrect.',
        statusCode: 401,
      });
    }
    const duplicate = await this.prisma.user.findFirst({
      where: { email: { equals: newEmail, mode: 'insensitive' }, id: { not: userId } },
    });
    if (duplicate) {
      throw new AppError({
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'That email cannot be used.',
        statusCode: 409,
      });
    }
    const rawToken = this.tokens.createOpaqueToken();
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailChangeToken.updateMany({
        where: { userId, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: now },
      }),
      this.prisma.emailChangeToken.create({
        data: {
          userId,
          newEmail,
          tokenHash: this.tokens.hashToken(rawToken),
          expiresAt: new Date(now.getTime() + this.config.EMAIL_VERIFICATION_EXPIRES_IN * 1_000),
        },
      }),
    ]);
    const template = verificationEmail({
      verificationUrl: `${this.config.WEB_URL}/verify-email-change?token=${encodeURIComponent(rawToken)}`,
      expiresInHours: Math.round(this.config.EMAIL_VERIFICATION_EXPIRES_IN / 3_600),
    });
    await this.email.send({ to: newEmail, ...template });
    await this.audit.write({
      actorUserId: userId,
      action: 'EMAIL_CHANGE_REQUESTED',
      resourceType: 'User',
      resourceId: userId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return { message: 'Check the new email address to confirm the change.' };
  }

  public async confirmEmailChange(
    rawToken: string,
    metadata: RequestMetadata,
  ): Promise<GenericMessageDto> {
    const token = await this.prisma.emailChangeToken.findUnique({
      where: { tokenHash: this.tokens.hashToken(rawToken) },
      include: { user: true },
    });
    if (
      !token ||
      token.consumedAt ||
      token.invalidatedAt ||
      token.expiresAt.getTime() <= Date.now()
    ) {
      throw new AppError({
        code: 'AUTH_TOKEN_INVALID',
        message: 'This email-change link is invalid or expired.',
        statusCode: 400,
      });
    }
    const duplicate = await this.prisma.user.findFirst({
      where: { email: { equals: token.newEmail, mode: 'insensitive' }, id: { not: token.userId } },
    });
    if (duplicate) {
      throw new AppError({
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'That email can no longer be used.',
        statusCode: 409,
      });
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailChangeToken.update({ where: { id: token.id }, data: { consumedAt: now } }),
      this.prisma.user.update({ where: { id: token.userId }, data: { email: token.newEmail } }),
      this.prisma.session.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'EMAIL_CHANGED' },
      }),
      this.prisma.sessionRefreshToken.updateMany({
        where: { session: { userId: token.userId }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    const template = securityNotificationEmail({
      title: 'Your WarrantyPass email was changed',
      description: `Your account email was changed to ${token.newEmail}. Contact support immediately if this was not you.`,
      securityUrl: `${this.config.WEB_URL}/login`,
    });
    await this.email.send({ to: token.user.email, ...template });
    await this.audit.write({
      actorUserId: token.userId,
      action: 'EMAIL_CHANGED',
      resourceType: 'User',
      resourceId: token.userId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return { message: 'Email changed. Sign in again with the new address.' };
  }

  public async deactivateAccount(
    userId: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await this.passwords.verify(password, user.passwordHash))) {
      throw new AppError({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'The password is incorrect.',
        statusCode: 401,
      });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DEACTIVATED', deletedAt: new Date() },
    });
    await this.logoutAll(userId, metadata);
    await this.audit.write({
      actorUserId: userId,
      action: 'ACCOUNT_DEACTIVATED',
      resourceType: 'User',
      resourceId: userId,
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  private async createSession(
    userId: string,
    kind: 'CUSTOMER' | 'PLATFORM_ADMIN',
    rememberMe: boolean,
    metadata: RequestMetadata,
  ): Promise<SessionResult> {
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const rawRefreshToken = this.tokens.createRefreshToken(sessionId);
    const refreshTokenHash = this.tokens.hashToken(rawRefreshToken);
    const duration = rememberMe
      ? this.config.AUTH_REMEMBER_ME_EXPIRES_IN
      : this.config.AUTH_REFRESH_TOKEN_EXPIRES_IN;
    const expiresAt = new Date(Date.now() + duration * 1_000);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        familyId,
        refreshTokenHash,
        rememberMe,
        expiresAt,
        lastUsedAt: new Date(),
        ...(metadata.ipAddress ? { ipAddress: metadata.ipAddress } : {}),
        ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
        deviceName: metadata.deviceName,
        refreshTokens: {
          create: { tokenHash: refreshTokenHash, expiresAt },
        },
      },
    });
    const access = await this.tokens.createAccessToken({ userId, sessionId, kind });
    const csrfToken = this.tokens.createOpaqueToken();
    return {
      authentication: {
        accessToken: access.token,
        accessTokenExpiresAt: access.expiresAt.toISOString(),
        csrfToken,
        user: await this.currentUser(userId),
        redirectTo: await this.redirectForUser(userId),
      },
      refreshToken: rawRefreshToken,
      refreshExpiresAt: expiresAt,
    };
  }

  private async buildCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        businessMemberships: {
          where: { status: 'ACTIVE', deletedAt: null },
          include: {
            business: true,
            roles: {
              include: { role: { include: { permissions: { include: { permission: true } } } } },
            },
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
        platformRoles: {
          where: { status: 'ACTIVE' },
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });
    if (!user) throw new NotFoundError('The account was not found.');
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      profile: {
        fullName: user.profile?.displayName ?? null,
        mobileNumber: user.profile?.phone ?? null,
        preferredLanguage: user.profile?.locale ?? 'en-BD',
        timezone: user.profile?.timezone ?? 'Asia/Dhaka',
      },
      businesses: user.businessMemberships.map((membership) => {
        const roles =
          membership.roles.length > 0
            ? membership.roles.map((assignment) => assignment.role)
            : [membership.role];
        return {
          id: membership.business.id,
          name: membership.business.name,
          slug: membership.business.slug,
          status:
            membership.business.status === 'PENDING_VERIFICATION'
              ? 'PENDING'
              : membership.business.status,
          membershipId: membership.id,
          membershipStatus: membership.status,
          roles: roles.map((role) => role.name),
          permissions: [
            ...new Set(
              roles.flatMap((role) =>
                role.permissions.map((assignment) => assignment.permission.key),
              ),
            ),
          ],
          isCurrent: user.lastActiveBusinessId === membership.businessId,
        };
      }),
      platformPermissions: [
        ...new Set(
          user.platformRoles.flatMap((assignment) =>
            assignment.role.permissions.map((permission) => permission.permission.key),
          ),
        ),
      ],
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async redirectForUser(userId: string): Promise<string> {
    const user = await this.currentUser(userId);
    if (user.platformPermissions.length > 0) return '/admin';
    if (user.businesses.length > 0) return '/business/dashboard';
    return '/dashboard';
  }

  private async recordFailedLogin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginCount: true },
    });
    if (!user) return;
    const failedLoginCount = user.failedLoginCount + 1;
    const locked =
      failedLoginCount >= this.config.AUTH_MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + this.config.AUTH_LOCKOUT_DURATION * 1_000)
        : null;
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount, ...(locked ? { lockedUntil: locked } : {}) },
    });
  }

  private async recordLoginAttempt(input: {
    userId?: string | undefined;
    emailHash: string;
    succeeded: boolean;
    failureReason?: string;
    metadata: RequestMetadata;
  }): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        emailHash: input.emailHash,
        succeeded: input.succeeded,
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.failureReason ? { failureReason: input.failureReason } : {}),
        requestId: input.metadata.requestId,
        ...(input.metadata.ipAddress ? { ipAddress: input.metadata.ipAddress } : {}),
        ...(input.metadata.userAgent ? { userAgent: input.metadata.userAgent } : {}),
      },
    });
    await this.audit.write({
      ...(input.userId ? { actorUserId: input.userId } : {}),
      action: input.succeeded ? 'LOGIN_SUCCEEDED' : 'LOGIN_FAILED',
      resourceType: 'User',
      resourceId: input.userId,
      requestId: input.metadata.requestId,
      ipAddress: input.metadata.ipAddress,
      userAgent: input.metadata.userAgent,
      metadata: { failureReason: input.failureReason ?? null },
    });
  }

  private async revokeFamilyForReuse(
    familyId: string,
    userId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { familyId, revokedAt: null },
        data: {
          revokedAt: now,
          reuseDetectedAt: now,
          revokedReason: 'REFRESH_TOKEN_REUSE',
        },
      }),
      this.prisma.sessionRefreshToken.updateMany({
        where: { session: { familyId }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    await this.audit.write({
      actorUserId: userId,
      action: 'REFRESH_TOKEN_REUSE_DETECTED',
      resourceType: 'Session',
      requestId: metadata.requestId,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  private async sendVerificationEmail(email: string, rawToken: string): Promise<void> {
    const template = verificationEmail({
      verificationUrl: `${this.config.WEB_URL}/verify-email?token=${encodeURIComponent(rawToken)}`,
      expiresInHours: Math.round(this.config.EMAIL_VERIFICATION_EXPIRES_IN / 3_600),
    });
    await this.email.send({ to: email, ...template });
  }

  private sessionIdFromRefreshToken(rawToken: string): string {
    const [sessionId, secret, ...rest] = rawToken.split('.');
    if (!sessionId || !secret || rest.length > 0) {
      throw this.sessionError('AUTH_TOKEN_INVALID', 'The refresh session is invalid.');
    }
    return sessionId;
  }

  private sessionError(code: string, message: string): AppError {
    return new AppError({ code, message, statusCode: 401 });
  }
}
