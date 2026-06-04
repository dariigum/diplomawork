import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { decryptSessionToken, encryptSessionPayload } from '@/lib/session-jwt';

export { decryptSessionToken as decrypt, encryptSessionPayload as encrypt } from '@/lib/session-jwt';

const sessionCookieOptions = () => ({
  httpOnly: true as const,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return null;
  return await decryptSessionToken(sessionCookie);
}

export async function setSession(user: { id: string; role: string; email: string }) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encryptSessionPayload({
    user: { id: String(user.id), role: user.role, email: user.email },
    expires,
  });

  const cookieStore = await cookies();
  cookieStore.set('session', session, { expires, ...sessionCookieOptions() });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { expires: new Date(0), ...sessionCookieOptions() });
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}
