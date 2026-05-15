import crypto from 'crypto';

const PREFIX = 'enc:v1:';

function getKey(): Buffer | null {
  const hex = process.env.CHAT_MESSAGE_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, 'hex');
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

export function encryptMessageTextForStorage(plain: string): string {
  const key = getKey();
  if (!key || plain === '') return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptMessageTextFromStorage(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored;
  const key = getKey();
  if (!key) return '';
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}
