import path from 'path';

export const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

export function getUploadsDirectory(): string {
  if (process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.trim()) {
    return path.resolve(process.env.UPLOADS_DIR.trim());
  }
  return path.join(process.cwd(), 'public', 'uploads');
}
