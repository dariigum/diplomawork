import crypto from 'crypto';

function secret(): string {
  return process.env.SESSION_SECRET || 'diploma-secret-super-long-key-for-jwt';
}

export function signAttachmentAccess(storageKey: string, expSec: number): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + expSec;
  const sig = crypto.createHmac('sha256', secret()).update(`${storageKey}:${exp}`).digest('hex');
  return { exp, sig };
}

export function verifyAttachmentAccess(storageKey: string, exp: number, sig: string): boolean {
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac('sha256', secret()).update(`${storageKey}:${exp}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function buildSignedAttachmentUrl(storageKey: string, ttlSec = 86400 * 7): string {
  const { exp, sig } = signAttachmentAccess(storageKey, ttlSec);
  const k = encodeURIComponent(storageKey);
  return `/api/chat-attachments?k=${k}&e=${exp}&s=${sig}`;
}
