import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const encryptionSecret =
  process.env.MESSAGE_ENCRYPTION_SECRET ||
  process.env.SESSION_SECRET ||
  'jobflow-message-encryption-secret';

const encryptionKey = createHash('sha256').update(encryptionSecret).digest();

export interface EncryptedChatPayload {
  encryptedContent: string;
  iv: string;
  authTag: string;
}

export function encryptChatMessage(content: string): EncryptedChatPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);

  return {
    encryptedContent: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptChatMessage(payload: EncryptedChatPayload) {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(payload.iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedContent, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
