import { google } from 'googleapis';
import { db } from '@/db';
import { google_accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not properly configured in environment variables.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getDriveClientForAccount(googleAccountId: string) {
  const account = db.select().from(google_accounts).where(eq(google_accounts.id, googleAccountId)).get();
  if (!account) {
    throw new Error(`Google account with ID ${googleAccountId} not found.`);
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: account.refresh_token,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return { drive, account };
}

/**
 * Searches for a folder with `folderName` under `parentFolderId`.
 * If it does not exist, creates it.
 */
export async function getOrCreateFolder(
  drive: any,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  // Sanitize folder name for query escaping
  const escapedName = folderName.replace(/'/g, "\\'");
  let query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    return listRes.data.files[0].id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    },
    fields: 'id',
  });

  return createRes.data.id;
}
