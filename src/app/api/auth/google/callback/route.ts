import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/googleDrive';
import { google } from 'googleapis';
import { db } from '@/db';
import { google_accounts } from '@/db/schema';
import { cryptoNativeUUID } from '@/lib/utils';
import { and, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const userId = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (error) {
    return NextResponse.redirect(`${appUrl}/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code || !userId) {
    return NextResponse.redirect(`${appUrl}/settings?error=missing_auth_code`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user profile info (email, name, picture)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email;
    const userName = userInfo.data.name || userEmail;
    const userPicture = userInfo.data.picture || null;

    if (!userEmail) {
      return NextResponse.redirect(`${appUrl}/settings?error=email_not_found`);
    }

    // Determine token to store (prefer refresh_token, fallback to access_token or existing)
    const existing = db
      .select()
      .from(google_accounts)
      .where(and(eq(google_accounts.user_id, userId), eq(google_accounts.email, userEmail)))
      .get();

    const existingAccounts = db
      .select()
      .from(google_accounts)
      .where(eq(google_accounts.user_id, userId))
      .all();

    const isFirstAccount = existingAccounts.length === 0;
    const tokenToStore = tokens.refresh_token || existing?.refresh_token || tokens.access_token || '';

    if (existing) {
      db.update(google_accounts)
        .set({
          refresh_token: tokenToStore,
          account_name: userName,
          avatar_url: userPicture,
        })
        .where(eq(google_accounts.id, existing.id))
        .run();
    } else {
      db.insert(google_accounts)
        .values({
          id: cryptoNativeUUID(),
          user_id: userId,
          email: userEmail,
          account_name: userName,
          avatar_url: userPicture,
          refresh_token: tokenToStore,
          is_default: isFirstAccount ? 1 : 0,
          created_at: Date.now(),
        })
        .run();
    }

    return NextResponse.redirect(`${appUrl}/settings?success=google_connected`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(
      `${appUrl}/settings?error=${encodeURIComponent(err.message || 'OAuth callback failed')}`
    );
  }
}
