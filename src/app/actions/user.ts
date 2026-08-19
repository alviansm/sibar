'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/telemetry';

export async function updateProfileNameAction(prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized session. Please log in again.' };
    }

    const fullName = (formData.get('fullName') as string || '').trim();

    db.update(users)
      .set({ full_name: fullName || null })
      .where(eq(users.id, session.userId))
      .run();

    await logActivity({
      userId: session.userId,
      activityType: 'settings_update',
      category: 'settings',
      title: 'Updated Profile Display Name',
      description: `Display name set to "${fullName || '(empty)'}"`,
      metadata: { fullName },
    });

    revalidatePath('/dashboard');
    revalidatePath('/settings');

    return { success: true, message: 'Profile updated successfully!', fullName };
  } catch (err: any) {
    return { error: err.message || 'Failed to update profile.' };
  }
}

export async function updatePasswordAction(prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized session. Please log in again.' };
    }

    const currentPassword = formData.get('currentPassword') as string || '';
    const newPassword = formData.get('newPassword') as string || '';
    const confirmPassword = formData.get('confirmPassword') as string || '';

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: 'All password fields are required.' };
    }

    if (newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters long.' };
    }

    if (newPassword !== confirmPassword) {
      return { error: 'New password and confirmation do not match.' };
    }

    const user = db.select().from(users).where(eq(users.id, session.userId)).get();
    if (!user) {
      return { error: 'User not found.' };
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return { error: 'Incorrect current password.' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    db.update(users)
      .set({ password_hash: newHash })
      .where(eq(users.id, session.userId))
      .run();

    await logActivity({
      userId: session.userId,
      activityType: 'settings_update',
      category: 'settings',
      title: 'Changed Account Password',
      description: 'Account security credentials updated successfully.',
      metadata: { username: user.username },
    });

    revalidatePath('/settings');

    return { success: true, message: 'Password updated successfully!' };
  } catch (err: any) {
    return { error: err.message || 'Failed to update password.' };
  }
}

export async function updateQuoteSettingsAction(prevState: any, formData: FormData) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized session. Please log in again.' };
    }

    const refreshInterval = (formData.get('quoteRefreshInterval') as string || 'hourly').toLowerCase();
    const category = (formData.get('quoteCategory') as string || 'inspirational').toLowerCase();

    const validIntervals = ['hourly', 'daily', 'always'];
    const validCategories = ['inspirational', 'education', 'learning', 'success', 'knowledge'];

    const targetInterval = validIntervals.includes(refreshInterval) ? refreshInterval : 'hourly';
    const targetCategory = validCategories.includes(category) ? category : 'inspirational';

    db.update(users)
      .set({
        quote_refresh_interval: targetInterval as any,
        quote_category: targetCategory,
      })
      .where(eq(users.id, session.userId))
      .run();

    await logActivity({
      userId: session.userId,
      activityType: 'settings_update',
      category: 'settings',
      title: 'Updated Motivational Quote Preferences',
      description: `Interval: ${targetInterval} | Category: ${targetCategory}`,
      metadata: { quoteRefreshInterval: targetInterval, quoteCategory: targetCategory },
    });

    revalidatePath('/dashboard');
    revalidatePath('/settings');

    return {
      success: true,
      message: 'Motivational quote preferences updated successfully!',
      quoteRefreshInterval: targetInterval,
      quoteCategory: targetCategory,
    };
  } catch (err: any) {
    return { error: err.message || 'Failed to update quote settings.' };
  }
}

