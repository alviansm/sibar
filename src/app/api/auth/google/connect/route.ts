import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/googleDrive';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent select_account', // Forces Google to supply refresh_token and allow choosing account
      include_granted_scopes: true,
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state: session.userId,
    });

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to initialize Google OAuth' }, { status: 500 });
  }
}
