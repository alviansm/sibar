import { NextRequest, NextResponse } from 'next/server';
import { getDriveClientForAccount, getOrCreateFolder } from '@/lib/googleDrive';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { attachments } from '@/db/schema';
import { cryptoNativeUUID } from '@/lib/utils';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const googleAccountId = formData.get('googleAccountId') as string;
    const entityType = formData.get('entityType') as 'concept' | 'problem' | 'exercise_set' | 'attempt';
    const entityId = formData.get('entityId') as string;
    const projectSlug = (formData.get('projectSlug') as string) || 'General';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (!googleAccountId) {
      return NextResponse.json(
        { error: 'No Google Drive account selected. Please select or connect an account in Settings.' },
        { status: 400 }
      );
    }

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'Missing entity type or ID.' }, { status: 400 });
    }

    const { drive } = await getDriveClientForAccount(googleAccountId);

    // Folder Category Name Mapping
    let categoryName = 'General';
    if (entityType === 'concept') categoryName = 'Concepts';
    else if (entityType === 'problem') categoryName = 'Problems';
    else if (entityType === 'exercise_set') categoryName = 'Problem Sets';
    else if (entityType === 'attempt') categoryName = 'Submissions';

    // 1. Establish Folder Structure: Sibar -> [Project] -> [Category]
    const rootFolderId = await getOrCreateFolder(drive, 'Sibar');
    const projectFolderId = await getOrCreateFolder(drive, projectSlug, rootFolderId);
    const targetFolderId = await getOrCreateFolder(drive, categoryName, projectFolderId);

    // 2. Stream file buffer to Google Drive
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const driveRes = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [targetFolderId],
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink, thumbnailLink',
    });

    const fileId = driveRes.data.id;
    if (!fileId) {
      throw new Error('Failed to obtain Google Drive file ID.');
    }

    // 3. Make file readable via link
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr) {
      console.warn('Could not set public read permission on file:', permErr);
    }

    // 4. Save record to SQLite
    const attachmentRecord = {
      id: cryptoNativeUUID(),
      google_account_id: googleAccountId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      drive_file_id: fileId,
      web_view_link: driveRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      thumbnail_link: driveRes.data.thumbnailLink || null,
      entity_type: entityType,
      entity_id: entityId,
      created_at: Date.now(),
    };

    db.insert(attachments).values(attachmentRecord).run();

    return NextResponse.json({ success: true, attachment: attachmentRecord });
  } catch (err: any) {
    console.error('Drive upload API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload file to Google Drive.' },
      { status: 500 }
    );
  }
}
