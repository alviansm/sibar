import { db } from '@/db';
import { user_activities, users } from '@/db/schema';
import { eq, desc, and, gte, lte, sql, like, or } from 'drizzle-orm';
import { cryptoNativeUUID } from './utils';
import { getSession } from './auth';

export type ActivityCategory =
  | 'auth'
  | 'workspace'
  | 'concept'
  | 'problem'
  | 'exercise'
  | 'project'
  | 'settings'
  | 'ai';

export interface LogActivityParams {
  userId?: string | null;
  activityType: string;
  category: ActivityCategory;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: number;
}

/**
 * Log a user activity asynchronously.
 * Wrapped in try-catch so it never disrupts the main application flow.
 */
export async function logActivity(params: LogActivityParams): Promise<string | null> {
  try {
    let targetUserId = params.userId;

    if (!targetUserId) {
      try {
        const session = await getSession();
        targetUserId = session?.userId || null;
      } catch (e) {
        // Ignore session extraction error in non-request contexts
      }
    }

    const id = cryptoNativeUUID();
    const now = params.createdAt || Math.floor(Date.now() / 1000);

    const metadataStr = params.metadata ? JSON.stringify(params.metadata) : null;

    db.insert(user_activities)
      .values({
        id,
        user_id: targetUserId,
        activity_type: params.activityType,
        category: params.category,
        title: params.title,
        description: params.description || null,
        metadata_json: metadataStr,
        created_at: now,
      })
      .run();

    return id;
  } catch (error) {
    console.error('Failed to log activity telemetry:', error);
    return null;
  }
}

export interface ActivityFilterOptions {
  userId?: string | null;
  category?: string | null;
  activityType?: string | null;
  searchQuery?: string | null;
  startDate?: number | null;
  endDate?: number | null;
  page?: number;
  limit?: number;
}

/**
 * Fetch paginated and filterable activity logs.
 */
export async function getActivityLogs(options: ActivityFilterOptions = {}) {
  const {
    userId,
    category,
    activityType,
    searchQuery,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = options;

  try {
    const conditions = [];

    if (userId) {
      conditions.push(eq(user_activities.user_id, userId));
    }

    if (category && category !== 'all') {
      conditions.push(eq(user_activities.category, category as ActivityCategory));
    }

    if (activityType && activityType !== 'all') {
      conditions.push(eq(user_activities.activity_type, activityType));
    }

    if (startDate) {
      conditions.push(gte(user_activities.created_at, startDate));
    }

    if (endDate) {
      conditions.push(lte(user_activities.created_at, endDate));
    }

    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim().toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`LOWER(${user_activities.title})`, q),
          like(sql`LOWER(${user_activities.description})`, q),
          like(sql`LOWER(${user_activities.activity_type})`, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matches
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(user_activities)
      .where(whereClause)
      .get();

    const total = countResult?.count || 0;
    const offset = Math.max(0, (page - 1) * limit);

    const rows = db
      .select()
      .from(user_activities)
      .where(whereClause)
      .orderBy(desc(user_activities.created_at))
      .limit(limit)
      .offset(offset)
      .all();

    const logs = rows.map((row) => {
      let parsedMetadata: Record<string, any> | null = null;
      if (row.metadata_json) {
        try {
          parsedMetadata = JSON.parse(row.metadata_json);
        } catch (e) {}
      }
      return {
        ...row,
        metadata: parsedMetadata,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      logs,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return { logs: [], total: 0, page: 1, limit, totalPages: 1 };
  }
}

export interface TelemetryOverviewData {
  totalActivities: number;
  workspaceVisitsCount: number;
  conceptsMasteredCount: number;
  problemsSolvedCount: number;
  exercisesCompletedCount: number;
  activeStreakDays: number;
  totalActiveDays: number;
  categoryDistribution: Record<string, number>;
  dailyTrend: Array<{ date: string; count: number; dayLabel: string }>;
  recentActivities: Array<any>;
}

/**
 * Get comprehensive telemetry statistics and trends for user dashboard.
 */
export async function getTelemetryOverview(userId?: string | null): Promise<TelemetryOverviewData> {
  try {
    const userCondition = userId ? eq(user_activities.user_id, userId) : undefined;

    const allActivities = db
      .select({
        id: user_activities.id,
        activity_type: user_activities.activity_type,
        category: user_activities.category,
        title: user_activities.title,
        description: user_activities.description,
        metadata_json: user_activities.metadata_json,
        created_at: user_activities.created_at,
      })
      .from(user_activities)
      .where(userCondition)
      .orderBy(desc(user_activities.created_at))
      .all();

    const totalActivities = allActivities.length;

    let workspaceVisitsCount = 0;
    let conceptsMasteredCount = 0;
    let problemsSolvedCount = 0;
    let exercisesCompletedCount = 0;

    const categoryDistribution: Record<string, number> = {
      auth: 0,
      workspace: 0,
      concept: 0,
      problem: 0,
      exercise: 0,
      project: 0,
      settings: 0,
      ai: 0,
    };

    // Calculate dates & streak
    const activeDatesSet = new Set<string>();

    allActivities.forEach((act) => {
      // Category count
      if (categoryDistribution[act.category] !== undefined) {
        categoryDistribution[act.category]++;
      } else {
        categoryDistribution[act.category] = 1;
      }

      // Specific metrics
      if (act.activity_type === 'workspace_open') workspaceVisitsCount++;
      if (act.activity_type === 'concept_complete') conceptsMasteredCount++;
      if (act.activity_type === 'problem_attempt' || act.activity_type === 'example_complete') {
        if (act.activity_type === 'example_complete') {
          problemsSolvedCount++;
        } else if (act.metadata_json) {
          try {
            const meta = JSON.parse(act.metadata_json);
            if (meta?.outcome === 'clean_solve') problemsSolvedCount++;
          } catch (e) {}
        }
      }
      if (act.activity_type === 'exercise_session_finish') exercisesCompletedCount++;

      // Active date
      const d = new Date(act.created_at * 1000);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      activeDatesSet.add(dateKey);
    });

    const totalActiveDays = activeDatesSet.size;

    // Calculate active streak
    let activeStreakDays = 0;
    const now = new Date();
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if today is active, if not check yesterday
    const todayKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    let isStreakActive = activeDatesSet.has(todayKey);

    if (!isStreakActive) {
      // Check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      const yestKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (activeDatesSet.has(yestKey)) {
        isStreakActive = true;
      }
    }

    if (isStreakActive) {
      while (true) {
        const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (activeDatesSet.has(key)) {
          activeStreakDays++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Daily trend for the past 14 days
    const dailyTrend: Array<{ date: string; count: number; dayLabel: string }> = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLabel = `${dayLabels[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;

      const dayStart = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime() / 1000);
      const dayEnd = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime() / 1000);

      const count = allActivities.filter((a) => a.created_at >= dayStart && a.created_at <= dayEnd).length;
      dailyTrend.push({ date: dateKey, count, dayLabel });
    }

    const recentActivities = allActivities.slice(0, 10).map((act) => {
      let meta = null;
      if (act.metadata_json) {
        try {
          meta = JSON.parse(act.metadata_json);
        } catch (e) {}
      }
      return { ...act, metadata: meta };
    });

    return {
      totalActivities,
      workspaceVisitsCount,
      conceptsMasteredCount,
      problemsSolvedCount,
      exercisesCompletedCount,
      activeStreakDays,
      totalActiveDays,
      categoryDistribution,
      dailyTrend,
      recentActivities,
    };
  } catch (error) {
    console.error('Error generating telemetry overview:', error);
    return {
      totalActivities: 0,
      workspaceVisitsCount: 0,
      conceptsMasteredCount: 0,
      problemsSolvedCount: 0,
      exercisesCompletedCount: 0,
      activeStreakDays: 0,
      totalActiveDays: 0,
      categoryDistribution: {
        auth: 0,
        workspace: 0,
        concept: 0,
        problem: 0,
        exercise: 0,
        project: 0,
        settings: 0,
        ai: 0,
      },
      dailyTrend: [],
      recentActivities: [],
    };
  }
}

/**
 * Clear or prune activity logs for a user.
 */
export async function clearUserActivityLogs(userId?: string | null, retentionDays?: number) {
  try {
    if (retentionDays && retentionDays > 0) {
      const cutoffTime = Math.floor(Date.now() / 1000) - retentionDays * 86400;
      if (userId) {
        db.delete(user_activities)
          .where(and(eq(user_activities.user_id, userId), lte(user_activities.created_at, cutoffTime)))
          .run();
      } else {
        db.delete(user_activities)
          .where(lte(user_activities.created_at, cutoffTime))
          .run();
      }
    } else {
      if (userId) {
        db.delete(user_activities)
          .where(eq(user_activities.user_id, userId))
          .run();
      } else {
        db.delete(user_activities).run();
      }
    }
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to clear activity logs' };
  }
}
