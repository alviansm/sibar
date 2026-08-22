import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { getUploadsDirectory, MIME_TYPES } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    if (!filename) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const uploadsDir = getUploadsDirectory();
    const filePath = path.join(uploadsDir, safeFilename);

    try {
      await stat(filePath);
    } catch {
      // File not found on disk
      return new NextResponse('Image Not Found', { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving uploaded image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
