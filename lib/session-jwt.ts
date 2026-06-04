import { SignJWT, jwtVerify } from 'jose';

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

export async function encryptSessionPayload(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSessionKey());
}

export async function decryptSessionToken(input: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(input.trim(), getSessionKey(), { algorithms: ['HS256'] });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
