import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.SESSION_SECRET || 'diploma-secret-super-long-key-for-jwt';
const key = new TextEncoder().encode(secretKey);
const TYP = 'google_signup_pending';

export async function signGooglePendingToken(email: string, name: string): Promise<string> {
  return await new SignJWT({ email, name, purpose: TYP })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(key);
}

export async function verifyGooglePendingToken(
  token: string
): Promise<{ email: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if ((payload as { purpose?: string }).purpose !== TYP) return null;
    const email = ((payload as { email?: string }).email || '').trim().toLowerCase();
    const name = ((payload as { name?: string }).name || '').trim();
    if (!email) return null;
    return { email, name };
  } catch {
    return null;
  }
}
