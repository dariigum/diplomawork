import { jwtVerify } from 'jose';

const secretKey = process.env.SESSION_SECRET || 'diploma-secret-super-long-key-for-jwt';
const key = new TextEncoder().encode(secretKey);

export type SocketSessionUser = { id: string; role: 'EMPLOYEE' | 'EMPLOYER'; email?: string };

export async function verifySessionJwt(token: string): Promise<{ user: SocketSessionUser } | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const u = (payload as any).user;
    if (!u?.id || (u.role !== 'EMPLOYEE' && u.role !== 'EMPLOYER')) return null;
    return { user: { id: u.id, role: u.role, email: u.email } };
  } catch {
    return null;
  }
}
