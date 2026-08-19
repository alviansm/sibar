'use server';

import { db } from '@/db';
import { google_accounts, attachments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { getDriveClientForAccount } from '@/lib/googleDrive';
import { revalidatePath } from 'next/cache';

export async function getGoogleAccountsAction() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized', accounts: [] };
    }

    const accounts = db
      .select({
        id: google_accounts.id,
        email: google_accounts.email,
        account_name: google_accounts.account_name,
        avatar_url: google_accounts.avatar_url,
        is_default: google_accounts.is_default,
        created_at: google_accounts.created_at,
      })
      .from(google_accounts)
      .where(eq(google_accounts.user_id, session.userId))
      .all();

    return { accounts };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch accounts', accounts: [] };
  }
}

export async function setDefaultGoogleAccountAction(accountId: string) {
  try {
    const session = await getSession();
    if (!session?.userId) return { error: 'Unauthorized' };

    // Reset all for user
    db.update(google_accounts)
      .set({ is_default: 0 })
      .where(eq(google_accounts.user_id, session.userId))
      .run();

    // Set selected to 1
    db.update(google_accounts)
      .set({ is_default: 1 })
      .where(and(eq(google_accounts.id, accountId), eq(google_accounts.user_id, session.userId)))
      .run();

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update default account' };
  }
}

export async function disconnectGoogleAccountAction(accountId: string) {
  try {
    const session = await getSession();
    if (!session?.userId) return { error: 'Unauthorized' };

    db.delete(google_accounts)
      .where(and(eq(google_accounts.id, accountId), eq(google_accounts.user_id, session.userId)))
      .run();

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to disconnect account' };
  }
}

export async function getAttachmentsAction(entityType: string, entityId: string) {
  try {
    const list = db
      .select()
      .from(attachments)
      .where(and(eq(attachments.entity_type, entityType as any), eq(attachments.entity_id, entityId)))
      .all();

    return { attachments: list };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch attachments', attachments: [] };
  }
}

export async function deleteAttachmentAction(attachmentId: string) {
  try {
    const session = await getSession();
    if (!session?.userId) return { error: 'Unauthorized' };

    const record = db.select().from(attachments).where(eq(attachments.id, attachmentId)).get();
    if (!record) return { error: 'Attachment not found' };

    // Try deleting file from Google Drive
    if (record.google_account_id && record.drive_file_id) {
      try {
        const { drive } = await getDriveClientForAccount(record.google_account_id);
        await drive.files.delete({ fileId: record.drive_file_id });
      } catch (driveErr) {
        console.warn('Could not delete file from Google Drive (might already be deleted):', driveErr);
      }
    }

    db.delete(attachments).where(eq(attachments.id, attachmentId)).run();

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete attachment' };
  }
}
