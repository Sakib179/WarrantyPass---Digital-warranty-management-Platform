import type {
  AuthenticationContext,
  BusinessAuthorizationContext,
  PlatformAuthorizationContext,
} from '../security/contracts.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticationContext;
      businessAuth?: BusinessAuthorizationContext;
      platformAuth?: PlatformAuthorizationContext;
    }
  }
}

export {};
