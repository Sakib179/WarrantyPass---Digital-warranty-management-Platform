import type { BusinessStatus, MemberStatus, UserStatus } from './statuses.js';

export interface UserProfileDto {
  fullName: string | null;
  mobileNumber: string | null;
  preferredLanguage: string;
  timezone: string;
}

export interface BusinessContextDto {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  membershipId: string;
  membershipStatus: MemberStatus;
  roles: string[];
  permissions: string[];
  isCurrent: boolean;
}

export interface CurrentUserDto {
  id: string;
  email: string;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  profile: UserProfileDto;
  businesses: BusinessContextDto[];
  platformPermissions: string[];
  createdAt: string;
}

export interface AuthenticationDto {
  accessToken: string;
  accessTokenExpiresAt: string;
  csrfToken: string;
  user: CurrentUserDto;
  redirectTo: string;
}

export interface RegistrationResultDto {
  userId: string;
  email: string;
  emailVerificationRequired: true;
  message: string;
}

export interface SessionDto {
  id: string;
  deviceName: string;
  browser: string | null;
  operatingSystem: string | null;
  ipHint: string | null;
  rememberMe: boolean;
  current: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

export interface GenericMessageDto {
  message: string;
}
