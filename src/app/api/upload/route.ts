import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPEG, WEBP, SVG, and GIF images are supported.' },
        { status: 400 }
      );
    }

    // Maximum file size: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists in public folder
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique safe file name
    const ext = path.extname(file.name) || `.${file.type.split('/')[1] || 'png'}`;
    const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const randomHex = crypto.randomBytes(6).toString('hex');
    const fileName = `img_${Date.now()}_${randomHex}${safeExt}`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${fileName}`,
      fileName,
    });
  } catch (error: any) {
    console.error('Image upload failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
