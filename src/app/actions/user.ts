'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

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

    revalidatePath('/settings');

    return { success: true, message: 'Password updated successfully!' };
  } catch (err: any) {
    return { error: err.message || 'Failed to update password.' };
  }
}
