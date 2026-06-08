import fs from 'fs';
import path from 'path';
import type { ServerResponse } from 'http';

const RESUME_PREFIX = '/uploads/resumes/';

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
};

/**
 * Runtime uploads land in public/uploads/resumes after `next build`.
 * Next.js prod handler may not serve those files; serve them explicitly.
 */
export function tryServeResumeUpload(pathname: string, res: ServerResponse): boolean {
  if (!pathname.startsWith(RESUME_PREFIX)) return false;

  const fileName = pathname.slice(RESUME_PREFIX.length);
  if (!fileName || fileName.includes('..') || fileName.includes('/')) return false;

  const root = path.join(process.cwd(), 'public', 'uploads', 'resumes');
  const abs = path.join(root, fileName);
  if (!abs.startsWith(root)) return false;

  let stat: fs.Stats;
  try {
    stat = fs.statSync(abs);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;

  const ext = path.extname(fileName).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_BY_EXT[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'private, max-age=3600',
  });
  fs.createReadStream(abs).pipe(res);
  return true;
}
