import { SignJWT, jwtVerify } from 'jose';

export type UserRole = 'ADMIN' | 'EMPLOYER' | 'EMPLOYEE';

export type SessionUser = {
  id: string;
  role: UserRole;
  email: string;
};

const USER_ROLES: UserRole[] = ['ADMIN', 'EMPLOYER', 'EMPLOYEE'];

function parseUserRole(role: unknown): UserRole | null {
  const r = String(role ?? '')
    .trim()
    .toUpperCase();
  return USER_ROLES.includes(r as UserRole) ? (r as UserRole) : null;
}

export type SessionPayload = {
  user: SessionUser;
  expires?: string | Date;
};

/** JWT helpers without `next/headers` — safe to import from custom server / Socket.IO. */
export function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return 'build-phase-placeholder-not-for-runtime';
      }
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    return secret;
  }
  return secret || 'diploma-secret-super-long-key-for-jwt';
}

function getSessionKey() {
  return new TextEncoder().encode(resolveSessionSecret());
}

export async function encryptSessionPayload(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSessionKey());
}

function parseSessionPayload(payload: Record<string, unknown>): SessionPayload | null {
  const user = payload.user;
  if (!user || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;
  const role = parseUserRole(u.role);
  if (typeof u.id !== 'string' || !role || typeof u.email !== 'string') {
    return null;
  }
  const expires = payload.expires;
  return {
    user: { id: u.id, role, email: u.email },
    ...(expires !== undefined ? { expires: expires as string | Date } : {}),
  };
}

export async function decryptSessionToken(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input.trim(), getSessionKey(), { algorithms: ['HS256'] });
    return parseSessionPayload(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}
