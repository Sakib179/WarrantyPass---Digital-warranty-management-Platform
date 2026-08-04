import type { NextFunction, Request, Response } from 'express';

import type { AppConfig } from '../../config/env.js';
import { AppError } from '../../common/errors/app-error.js';
import { csrfCookieOptions, refreshCookieOptions } from '../../common/security/cookies.js';
import { requestMetadata } from '../../common/security/request-metadata.js';
import type { AuthService } from './auth.service.js';

export class AuthController {
  public constructor(
    private readonly service: AuthService,
    private readonly config: AppConfig,
  ) {}

  public register = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      email: string;
      password: string;
      fullName?: string;
      mobileNumber?: string;
      preferredLanguage: 'en-BD' | 'bn-BD';
    };
    const data = await this.service.registerCustomer(body, requestMetadata(req));
    res.status(201).json({ success: true, data, meta: {} });
  };

  public verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.verifyEmail(
      (req.body as { token: string }).token,
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public resendVerification = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.resendVerification(
      (req.body as { email: string }).email,
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.login(
      req.body as { email: string; password: string; rememberMe: boolean },
      requestMetadata(req),
    );
    this.setSessionCookies(
      res,
      result.refreshToken,
      result.authentication.csrfToken,
      result.refreshExpiresAt,
    );
    res.json({ success: true, data: result.authentication, meta: {} });
  };

  public refresh = async (req: Request, res: Response): Promise<void> => {
    const rawToken = this.readRefreshCookie(req);
    const result = await this.service.refresh(rawToken, requestMetadata(req));
    this.setSessionCookies(
      res,
      result.refreshToken,
      result.authentication.csrfToken,
      result.refreshExpiresAt,
    );
    res.json({ success: true, data: result.authentication, meta: {} });
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    const rawToken = this.optionalRefreshCookie(req);
    await this.service.logout(rawToken?.split('.')[0], requestMetadata(req));
    this.clearSessionCookies(res);
    res.json({ success: true, data: { message: 'Signed out.' }, meta: {} });
  };

  public logoutAll = async (req: Request, res: Response): Promise<void> => {
    await this.service.logoutAll(requireAuth(req).userId, requestMetadata(req));
    this.clearSessionCookies(res);
    res.json({ success: true, data: { message: 'All sessions were signed out.' }, meta: {} });
  };

  public me = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.currentUser(requireAuth(req).userId);
    res.json({ success: true, data, meta: {} });
  };

  public forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.forgotPassword(
      (req.body as { email: string }).email,
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { token: string; password: string };
    const data = await this.service.resetPassword(body.token, body.password, requestMetadata(req));
    this.clearSessionCookies(res);
    res.json({ success: true, data, meta: {} });
  };

  public changePassword = async (req: Request, res: Response): Promise<void> => {
    const auth = requireAuth(req);
    const body = req.body as { currentPassword: string; password: string };
    const data = await this.service.changePassword(
      auth.userId,
      auth.sessionId,
      body.currentPassword,
      body.password,
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public sessions = async (req: Request, res: Response): Promise<void> => {
    const auth = requireAuth(req);
    const data = await this.service.listSessions(auth.userId, auth.sessionId);
    res.json({ success: true, data, meta: {} });
  };

  public revokeSession = async (req: Request, res: Response): Promise<void> => {
    await this.service.revokeSession(
      requireAuth(req).userId,
      routeParam(req, 'sessionId'),
      requestMetadata(req),
    );
    res.json({ success: true, data: { message: 'Session revoked.' }, meta: {} });
  };

  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.updateProfile(
      requireAuth(req).userId,
      req.body as {
        fullName?: string | null;
        mobileNumber?: string | null;
        preferredLanguage?: 'en-BD' | 'bn-BD';
      },
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public requestEmailChange = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { newEmail: string; password: string };
    const data = await this.service.requestEmailChange(
      requireAuth(req).userId,
      body.newEmail,
      body.password,
      requestMetadata(req),
    );
    res.json({ success: true, data, meta: {} });
  };

  public confirmEmailChange = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.confirmEmailChange(
      (req.body as { token: string }).token,
      requestMetadata(req),
    );
    this.clearSessionCookies(res);
    res.json({ success: true, data, meta: {} });
  };

  public deactivate = async (req: Request, res: Response): Promise<void> => {
    await this.service.deactivateAccount(
      requireAuth(req).userId,
      (req.body as { password: string }).password,
      requestMetadata(req),
    );
    this.clearSessionCookies(res);
    res.json({ success: true, data: { message: 'Account deactivated.' }, meta: {} });
  };

  public handleError =
    (handler: (request: Request, response: Response) => Promise<void>) =>
    (request: Request, response: Response, next: NextFunction): void => {
      void handler(request, response).catch(next);
    };

  private readRefreshCookie(req: Request): string {
    const value = this.optionalRefreshCookie(req);
    if (!value) {
      throw new AppError({
        code: 'AUTH_SESSION_INVALID',
        message: 'Your session is unavailable. Please sign in again.',
        statusCode: 401,
      });
    }
    return value;
  }

  private optionalRefreshCookie(req: Request): string | undefined {
    const value = (req.cookies as Record<string, unknown> | undefined)?.[
      this.config.AUTH_COOKIE_NAME
    ];
    return typeof value === 'string' ? value : undefined;
  }

  private setSessionCookies(
    res: Response,
    refreshToken: string,
    csrfToken: string,
    expiresAt: Date,
  ): void {
    const maxAgeMs = Math.max(0, expiresAt.getTime() - Date.now());
    res.cookie(
      this.config.AUTH_COOKIE_NAME,
      refreshToken,
      refreshCookieOptions(this.config, maxAgeMs),
    );
    res.cookie(
      this.config.AUTH_CSRF_COOKIE_NAME,
      csrfToken,
      csrfCookieOptions(this.config, maxAgeMs),
    );
  }

  private clearSessionCookies(res: Response): void {
    res.clearCookie(this.config.AUTH_COOKIE_NAME, refreshCookieOptions(this.config));
    res.clearCookie(this.config.AUTH_CSRF_COOKIE_NAME, csrfCookieOptions(this.config));
  }
}

function requireAuth(req: Request): NonNullable<Request['auth']> {
  if (!req.auth) throw new Error('Authentication middleware did not set the request context.');
  return req.auth;
}

function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === 'string' ? value : '';
}
