import { decryptSessionToken } from '@/lib/session-jwt';

export type SocketSessionUser = { id: string; role: 'EMPLOYEE' | 'EMPLOYER'; email?: string };

function normalizeToken(raw: string): string {
  let tok = raw.trim();
  if ((tok.startsWith('"') && tok.endsWith('"')) || (tok.startsWith("'") && tok.endsWith("'"))) {
    tok = tok.slice(1, -1);
  }
  try {
    return decodeURIComponent(tok);
  } catch {
    return tok;
  }
}

function normalizeUserId(id: unknown): string | null {
  if (typeof id === 'string' && id.length > 0) return id;
  if (id != null && typeof (id as { toString?: () => string }).toString === 'function') {
    const s = (id as { toString: () => string }).toString();
    return s.length > 0 ? s : null;
  }
  return null;
}

function normalizeRole(role: unknown): 'EMPLOYEE' | 'EMPLOYER' | null {
  const r = String(role ?? '')
    .trim()
    .toUpperCase();
  if (r === 'EMPLOYEE' || r === 'EMPLOYER') return r;
  return null;
}

/** Same JWT verification as HTTP routes (`lib/session-jwt`). */
export async function verifySessionJwt(rawToken: string): Promise<{ user: SocketSessionUser } | null> {
  const payload = await decryptSessionToken(normalizeToken(rawToken));
  if (!payload) return null;
  const u = payload.user as { id?: unknown; role?: unknown; email?: string } | undefined;
  const id = normalizeUserId(u?.id);
  const role = normalizeRole(u?.role);
  if (!id || !role) return null;
  return {
    user: {
      id,
      role,
      email: typeof u?.email === 'string' ? u.email : undefined,
    },
  };
}
