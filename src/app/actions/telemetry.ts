'use server';

import { getSession } from '@/lib/auth';
import {
  logActivity,
  getTelemetryOverview,
  getActivityLogs,
  getActivitiesForDate,
  clearUserActivityLogs,
  ActivityFilterOptions,
  ActivityCategory,
} from '@/lib/telemetry';
import { revalidatePath } from 'next/cache';

export async function getStatsOverviewAction() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized session' };
    }

    const overview = await getTelemetryOverview(session.userId);
    return { success: true, overview };
  } catch (error: any) {
    return { error: error.message || 'Failed to load stats overview' };
  }
}

export async function getDayActivitiesAction(dateStr: string) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized session' };
    }

    const activities = await getActivitiesForDate(session.userId, dateStr);
    return { success: true, activities };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch day activities' };
  }
}

export async function getTelemetryDashboardDataAction(filters: ActivityFilterOptions = {}) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized session' };
    }

    const overview = await getTelemetryOverview(session.userId);
    const logsData = await getActivityLogs({
      ...filters,
      userId: session.userId,
    });

    return {
      success: true,
      overview,
      logsData,
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to load telemetry data' };
  }
}

export async function logClientActivityAction(params: {
  activityType: string;
  category: ActivityCategory;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const session = await getSession();
    const userId = session?.userId || null;

    const id = await logActivity({
      userId,
      activityType: params.activityType,
      category: params.category,
      title: params.title,
      description: params.description,
      metadata: params.metadata,
    });

    return { success: true, id };
  } catch (error: any) {
    return { error: error.message || 'Failed to log client activity' };
  }
}

export async function exportTelemetryLogsAction(format: 'json' | 'csv' = 'json') {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized session' };
    }

    const result = await getActivityLogs({
      userId: session.userId,
      limit: 5000,
    });

    if (format === 'json') {
      const dataStr = JSON.stringify(result.logs, null, 2);
      return { success: true, format: 'json', content: dataStr, filename: `sibar_telemetry_${Date.now()}.json` };
    } else {
      // CSV format
      const headers = ['ID', 'Timestamp', 'Date UTC', 'Category', 'Activity Type', 'Title', 'Description', 'Metadata'];
      const rows = result.logs.map((log) => {
        const dateStr = new Date(log.created_at * 1000).toISOString();
        const metaStr = log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : '';
        const descStr = (log.description || '').replace(/"/g, '""');
        const titleStr = (log.title || '').replace(/"/g, '""');
        return `"${log.id}","${log.created_at}","${dateStr}","${log.category}","${log.activity_type}","${titleStr}","${descStr}","${metaStr}"`;
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      return { success: true, format: 'csv', content: csvContent, filename: `sibar_telemetry_${Date.now()}.csv` };
    }
  } catch (error: any) {
    return { error: error.message || 'Failed to export telemetry data' };
  }
}

export async function clearActivityLogsAction(retentionDays?: number) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: 'Unauthorized session' };
    }

    const result = await clearUserActivityLogs(session.userId, retentionDays);
    if (result.error) {
      return { error: result.error };
    }

    revalidatePath('/settings');
    return { success: true, message: retentionDays ? `Cleared activity logs older than ${retentionDays} days.` : 'Cleared all activity logs successfully.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to clear activity logs' };
  }
}
