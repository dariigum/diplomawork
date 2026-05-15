import path from 'path';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const MAGIC: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'application/msword', bytes: [0xd0, 0xcf, 0x11, 0xe0] },
  { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: [0x50, 0x4b, 0x03, 0x04] },
];

function matchesMagic(buf: Buffer, rule: (typeof MAGIC)[0]): boolean {
  const off = rule.offset ?? 0;
  for (let i = 0; i < rule.bytes.length; i++) {
    if (buf[off + i] !== rule.bytes[i]) return false;
  }
  return true;
}

export function sniffMimeFromBuffer(buf: Buffer): string | null {
  for (const rule of MAGIC) {
    if (buf.length >= (rule.offset ?? 0) + rule.bytes.length && matchesMagic(buf, rule)) {
      if (rule.mime === 'image/webp') {
        if (buf.length < 12 || buf.toString('ascii', 8, 12) !== 'WEBP') continue;
      }
      return rule.mime;
    }
  }
  return null;
}

export function assertAllowedUpload(mimeFromClient: string, buffer: Buffer): { mime: string; ext: string } {
  const sniffed = sniffMimeFromBuffer(buffer);
  const mime = sniffed || mimeFromClient;
  if (!ALLOWED_MIMES.has(mime)) {
    throw new Error('Unsupported file type');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error(`File too large (max ${MAX_BYTES / 1024 / 1024} MB)`);
  }
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new Error('Unsupported file type');
  return { mime, ext };
}

export function safeBasename(name: string): string {
  const base = path.basename(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'file';
}

export { MAX_BYTES as MAX_CHAT_ATTACHMENT_BYTES };
