'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { AuthenticationDto, CurrentUserDto } from '@warrantypass/shared';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  apiRequest,
  clearApiAuthentication,
  refreshAuthentication,
  setActiveBusinessId,
  setAuthenticationToken,
} from '@/lib/api-client';

type AuthenticationStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthenticationStatus;
  user: CurrentUserDto | null;
  login(input: {
    email: string;
    password: string;
    rememberMe: boolean;
  }): Promise<AuthenticationDto>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
  refreshUser(): Promise<CurrentUserDto | null>;
  switchBusiness(businessId: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [status, setStatus] = useState<AuthenticationStatus>('loading');
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const applyAuthentication = useCallback((authentication: AuthenticationDto): void => {
    setAuthenticationToken(authentication.accessToken);
    const currentBusiness =
      authentication.user.businesses.find((business) => business.isCurrent) ??
      authentication.user.businesses[0];
    setActiveBusinessId(currentBusiness?.id ?? null);
    setUser(authentication.user);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    let active = true;
    void refreshAuthentication().then((authentication) => {
      if (!active) return;
      if (authentication) applyAuthentication(authentication);
      else setStatus('unauthenticated');
    });
    return () => {
      active = false;
    };
  }, [applyAuthentication]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async login(input) {
        const authentication = await apiRequest<AuthenticationDto>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(input),
          retryAuthentication: false,
        });
        applyAuthentication(authentication);
        return authentication;
      },
      async logout() {
        try {
          await apiRequest('/auth/logout', { method: 'POST', retryAuthentication: false });
        } finally {
          clearApiAuthentication();
          setUser(null);
          setStatus('unauthenticated');
          queryClient.clear();
          router.replace('/');
        }
      },
      async logoutAll() {
        try {
          await apiRequest('/auth/logout-all', { method: 'POST' });
        } finally {
          clearApiAuthentication();
          setUser(null);
          setStatus('unauthenticated');
          queryClient.clear();
          router.replace('/login');
        }
      },
      async refreshUser() {
        if (status !== 'authenticated') return null;
        const current = await apiRequest<CurrentUserDto>('/auth/me');
        setUser(current);
        return current;
      },
      async switchBusiness(businessId) {
        await apiRequest('/businesses/switch', {
          method: 'POST',
          body: JSON.stringify({ businessId }),
        });
        setActiveBusinessId(businessId);
        await queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'business',
        });
        const current = await apiRequest<CurrentUserDto>('/auth/me');
        setUser(current);
      },
    }),
    [applyAuthentication, queryClient, router, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
