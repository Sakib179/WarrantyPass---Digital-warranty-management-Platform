import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { SignJWT, errors, jwtVerify } from 'jose';

import type { AppConfig } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { AccessTokenClaims, AccessTokenResult } from './contracts.js';

export class TokenService {
  private readonly accessSecret: Uint8Array;

  public constructor(private readonly config: AppConfig) {
    this.accessSecret = new TextEncoder().encode(config.AUTH_ACCESS_TOKEN_SECRET);
  }

  public async createAccessToken(input: {
    userId: string;
    sessionId: string;
    kind: 'CUSTOMER' | 'PLATFORM_ADMIN';
  }): Promise<AccessTokenResult> {
    const now = Math.floor(Date.now() / 1_000);
    const expiresAtSeconds = now + this.config.AUTH_ACCESS_TOKEN_EXPIRES_IN;
    const token = await new SignJWT({ sid: input.sessionId, kind: input.kind })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(input.userId)
      .setIssuedAt(now)
      .setExpirationTime(expiresAtSeconds)
      .setIssuer('warrantypass-api')
      .setAudience('warrantypass-web')
      .sign(this.accessSecret);

    return { token, expiresAt: new Date(expiresAtSeconds * 1_000) };
  }

  public async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const verified = await jwtVerify(token, this.accessSecret, {
        issuer: 'warrantypass-api',
        audience: 'warrantypass-web',
        algorithms: ['HS256'],
      });
      const subject = verified.payload.sub;
      const sessionId = verified.payload.sid;
      const kind = verified.payload.kind;
      const issuedAt = verified.payload.iat;
      const expiresAt = verified.payload.exp;
      if (
        !subject ||
        typeof sessionId !== 'string' ||
        (kind !== 'CUSTOMER' && kind !== 'PLATFORM_ADMIN') ||
        typeof issuedAt !== 'number' ||
        typeof expiresAt !== 'number'
      ) {
        throw new Error('Required access-token claims are missing.');
      }
      return { subject, sessionId, kind, issuedAt, expiresAt };
    } catch (error) {
      const expired = error instanceof errors.JWTExpired;
      throw new AppError({
        code: expired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
        message: expired ? 'Your access token has expired.' : 'The access token is invalid.',
        statusCode: 401,
        cause: error,
      });
    }
  }

  public createRefreshToken(sessionId: string): string {
    return `${sessionId}.${randomBytes(48).toString('base64url')}`;
  }

  public createOpaqueToken(): string {
    return randomBytes(48).toString('base64url');
  }

  public hashToken(token: string): string {
    return createHmac('sha256', this.config.AUTH_REFRESH_TOKEN_SECRET).update(token).digest('hex');
  }

  public safeTokenEquals(left: string, right: string): boolean {
    const leftHash = Buffer.from(this.hashToken(left), 'hex');
    const rightHash = Buffer.from(this.hashToken(right), 'hex');
    return timingSafeEqual(leftHash, rightHash);
  }
}
