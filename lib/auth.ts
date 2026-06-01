import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim()
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      // next build sets NODE_ENV=production; allow collect page data without crashing
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return 'build-phase-placeholder-not-for-runtime'
      }
      throw new Error('SESSION_SECRET environment variable is required in production')
    }
    return secret
  }
  return secret || 'diploma-secret-super-long-key-for-jwt'
}

const secretKey = resolveSessionSecret()
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return null;
  try {
    return await decrypt(sessionCookie);
  } catch (error) {
    return null;
  }
}

export async function setSession(user: { id: string; role: string; email: string }) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week
  const session = await encrypt({ user, expires });
  
  const cookieStore = await cookies();
  cookieStore.set('session', session, { expires, httpOnly: true });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { expires: new Date(0) });
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}
