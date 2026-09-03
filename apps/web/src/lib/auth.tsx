'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const STORAGE_KEY = 'gboroly_auth';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
export interface Org {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
  currency?: string | null;
  role?: string;
}
interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  orgs: Org[];
  activeOrgId: string;
}

interface AuthState {
  ready: boolean; // hydratation terminée
  session: Session | null;
  user: AuthUser | null;
  activeOrg: Org | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  setActiveOrg: (orgId: string) => void;
  apiFetch: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthState | null>(null);

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function save(s: Session | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* stockage indisponible → session en mémoire seulement */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  // Refresh « single-flight » : plusieurs 401 concurrents partagent UNE seule
  // requête de refresh (le refresh token tourne à chaque usage → sinon course).
  const refreshing = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    setSession(load());
    setReady(true);
  }, []);

  const persist = useCallback((s: Session | null) => {
    setSession(s);
    save(s);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Identifiants invalides');
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string; user: AuthUser };

      // Récupère les organisations de l'utilisateur pour définir l'org active.
      const orgsRes = await fetch(`${API_BASE}/organizations/mine`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const orgsRaw = orgsRes.ok
        ? ((await orgsRes.json()) as { organization: Org; role: string }[])
        : [];
      const orgs: Org[] = orgsRaw.map((o) => ({ ...o.organization, role: o.role }));

      persist({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        orgs,
        activeOrgId: orgs[0]?.id ?? '',
      });
    },
    [persist],
  );

  const logout = useCallback(() => {
    const rt = session?.refreshToken;
    if (rt) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
    persist(null);
  }, [persist, session]);

  const setActiveOrg = useCallback(
    (orgId: string) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, activeOrgId: orgId };
        save(next);
        return next;
      });
    },
    [],
  );

  const apiFetch = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const current = load() ?? session;
      if (!current) throw new Error('NON_AUTHENTIFIE');

      const doFetch = (accessToken: string) =>
        fetch(`${API_BASE}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-Organization-Id': current.activeOrgId,
            ...(init.headers ?? {}),
          },
        });

      let res = await doFetch(current.accessToken);

      // 401 → rafraîchissement single-flight (une requête partagée), puis retry.
      if (res.status === 401) {
        if (!refreshing.current) {
          const rt = (load() ?? current).refreshToken;
          refreshing.current = fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          })
            .then(async (r) => {
              if (!r.ok) return null;
              const nd = (await r.json()) as { accessToken: string; refreshToken: string };
              const base = load() ?? current;
              persist({ ...base, accessToken: nd.accessToken, refreshToken: nd.refreshToken });
              return nd.accessToken;
            })
            .catch(() => null)
            .finally(() => {
              refreshing.current = null;
            });
        }
        const newToken = await refreshing.current;
        if (!newToken) {
          persist(null);
          throw new Error('SESSION_EXPIREE');
        }
        res = await doFetch(newToken);
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Erreur ${res.status}`);
      }
      return (await res.json()) as T;
    },
    [persist, session],
  );

  const value = useMemo<AuthState>(() => {
    const activeOrg = session?.orgs.find((o) => o.id === session.activeOrgId) ?? session?.orgs[0] ?? null;
    return {
      ready,
      session,
      user: session?.user ?? null,
      activeOrg,
      login,
      logout,
      setActiveOrg,
      apiFetch,
    };
  }, [ready, session, login, logout, setActiveOrg, apiFetch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
