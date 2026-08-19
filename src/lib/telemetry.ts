import { db } from '@/db';
import { user_activities, users, problem_attempts } from '@/db/schema';
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

export interface DailyStudyTimePoint {
  date: string;
  dayLabel: string;
  shortLabel: string;
  conceptSeconds: number;
  problemSeconds: number;
  exerciseSeconds: number;
  totalSeconds: number;
  totalMinutes: number;
  activityCount: number;
}

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
  activeStreakWeeks: number;
  isTodayActive: boolean;
  totalActiveDays: number;
  activeDates: string[];
  categoryDistribution: Record<string, number>;
  dailyTrend: Array<{ date: string; count: number; dayLabel: string }>;
  dailyStudyTimeTrend: DailyStudyTimePoint[];
  totalConceptSeconds: number;
  totalProblemSeconds: number;
  totalExerciseSeconds: number;
  totalStudySeconds: number;
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

    // Query Problem Attempts with time spent
    const allAttempts = db
      .select({
        id: problem_attempts.id,
        time_spent_seconds: problem_attempts.time_spent_seconds,
        created_at: problem_attempts.created_at,
      })
      .from(problem_attempts)
      .where(eq(problem_attempts.is_deleted, 0))
      .all();

    const totalActivities = allActivities.length;

    let workspaceVisitsCount = 0;
    let conceptsMasteredCount = 0;
    let problemsSolvedCount = 0;
    let exercisesCompletedCount = 0;

    let totalConceptSeconds = 0;
    let totalProblemSeconds = 0;
    let totalExerciseSeconds = 0;

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

      // Extract recorded time spent if any
      let timeSpent = 0;
      if (act.metadata_json) {
        try {
          const meta = JSON.parse(act.metadata_json);
          timeSpent = Number(meta?.timeSpentSeconds || meta?.time_spent_seconds || 0);
        } catch (e) {}
      }

      if (act.category === 'concept' || act.activity_type.includes('concept')) {
        totalConceptSeconds += timeSpent > 0 ? timeSpent : (act.activity_type === 'concept_complete' ? 180 : 60);
      } else if (act.category === 'problem' || act.activity_type.includes('problem') || act.activity_type.includes('example')) {
        totalProblemSeconds += timeSpent > 0 ? timeSpent : (act.activity_type === 'example_complete' ? 180 : 60);
      } else if (act.category === 'exercise' || act.activity_type.includes('exercise')) {
        totalExerciseSeconds += timeSpent > 0 ? timeSpent : (act.activity_type === 'exercise_session_finish' ? 300 : 120);
      }

      // Active date: only for subchapter-related activities (Concept, Problem, Exercise)
      const isSubchapterActivity =
        act.category === 'concept' ||
        act.category === 'problem' ||
        act.category === 'exercise' ||
        act.activity_type.includes('concept') ||
        act.activity_type.includes('problem') ||
        act.activity_type.includes('example') ||
        act.activity_type.includes('exercise');

      if (isSubchapterActivity) {
        const d = new Date(act.created_at * 1000);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        activeDatesSet.add(dateKey);
      }
    });

    // Add problem attempts direct stopwatch time
    allAttempts.forEach((attempt) => {
      totalProblemSeconds += attempt.time_spent_seconds || 0;
    });

    const totalStudySeconds = totalConceptSeconds + totalProblemSeconds + totalExerciseSeconds;
    const totalActiveDays = activeDatesSet.size;

    // Calculate active daily streak
    let activeStreakDays = 0;
    const now = new Date();
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const isTodayActive = activeDatesSet.has(todayKey);
    let isStreakActive = isTodayActive;

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

    // Calculate Weekly Streak (consecutive weeks with at least 1 active study day)
    const getWeekKey = (d: Date) => {
      const target = new Date(d.valueOf());
      const dayNr = (d.getDay() + 6) % 7; // Monday = 0
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
      }
      const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
      return `${target.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    };

    const activeWeeksSet = new Set<string>();
    activeDatesSet.forEach((dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      activeWeeksSet.add(getWeekKey(dateObj));
    });

    let activeStreakWeeks = 0;
    const currentWeekKey = getWeekKey(new Date());
    let weekCheckDate = new Date();
    let isWeekStreakActive = activeWeeksSet.has(currentWeekKey);

    if (!isWeekStreakActive) {
      // Check last week
      weekCheckDate.setDate(weekCheckDate.getDate() - 7);
      const lastWeekKey = getWeekKey(weekCheckDate);
      if (activeWeeksSet.has(lastWeekKey)) {
        isWeekStreakActive = true;
      }
    }

    if (isWeekStreakActive) {
      while (true) {
        const wKey = getWeekKey(weekCheckDate);
        if (activeWeeksSet.has(wKey)) {
          activeStreakWeeks++;
          weekCheckDate.setDate(weekCheckDate.getDate() - 7);
        } else {
          break;
        }
      }
    }

    // Daily trend and Study Time Trend for the past 30 days
    const dailyTrend: Array<{ date: string; count: number; dayLabel: string }> = [];
    const dailyStudyTimeTrend: DailyStudyTimePoint[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLabel = `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
      const shortLabel = `${monthNames[d.getMonth()]} ${d.getDate()}`;

      const dayStart = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime() / 1000);
      const dayEnd = Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime() / 1000);

      const dayActs = allActivities.filter((a) => a.created_at >= dayStart && a.created_at <= dayEnd);
      const count = dayActs.length;
      dailyTrend.push({ date: dateKey, count, dayLabel });

      let conceptSec = 0;
      let problemSec = 0;
      let exerciseSec = 0;

      dayActs.forEach((act) => {
        let actTime = 0;
        if (act.metadata_json) {
          try {
            const meta = JSON.parse(act.metadata_json);
            actTime = Number(meta?.timeSpentSeconds || meta?.time_spent_seconds || 0);
          } catch (e) {}
        }

        if (act.category === 'concept' || act.activity_type.includes('concept')) {
          conceptSec += actTime > 0 ? actTime : (act.activity_type === 'concept_complete' ? 180 : 60);
        } else if (act.category === 'problem' || act.activity_type.includes('problem') || act.activity_type.includes('example')) {
          problemSec += actTime > 0 ? actTime : (act.activity_type === 'example_complete' ? 180 : 60);
        } else if (act.category === 'exercise' || act.activity_type.includes('exercise')) {
          exerciseSec += actTime > 0 ? actTime : (act.activity_type === 'exercise_session_finish' ? 300 : 120);
        }
      });

      // Add attempts in that day
      allAttempts
        .filter((att) => att.created_at >= dayStart && att.created_at <= dayEnd)
        .forEach((att) => {
          problemSec += att.time_spent_seconds || 0;
        });

      const dayTotalSec = conceptSec + problemSec + exerciseSec;
      const dayTotalMin = Math.round((dayTotalSec / 60) * 10) / 10;

      dailyStudyTimeTrend.push({
        date: dateKey,
        dayLabel,
        shortLabel,
        conceptSeconds: conceptSec,
        problemSeconds: problemSec,
        exerciseSeconds: exerciseSec,
        totalSeconds: dayTotalSec,
        totalMinutes: dayTotalMin,
        activityCount: count,
      });
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
      activeStreakWeeks,
      isTodayActive,
      totalActiveDays,
      activeDates: Array.from(activeDatesSet),
      categoryDistribution,
      dailyTrend,
      dailyStudyTimeTrend,
      totalConceptSeconds,
      totalProblemSeconds,
      totalExerciseSeconds,
      totalStudySeconds,
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
      activeStreakWeeks: 0,
      isTodayActive: false,
      totalActiveDays: 0,
      activeDates: [],
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
      dailyStudyTimeTrend: [],
      totalConceptSeconds: 0,
      totalProblemSeconds: 0,
      totalExerciseSeconds: 0,
      totalStudySeconds: 0,
      recentActivities: [],
    };
  }
}

export interface FormattedDayActivity {
  id: string;
  activity_type: string;
  category: ActivityCategory;
  title: string;
  description: string | null;
  formattedContext: string;
  created_at: number;
  metadata: Record<string, any> | null;
}

/**
 * Get detailed activity records for a specific day formatted as:
 * "Activity Name (Exercise/Concept - Subchapter - Workspace)"
 */
export async function getActivitiesForDate(
  userId: string | null | undefined,
  dateStr: string // YYYY-MM-DD
): Promise<FormattedDayActivity[]> {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayStart = Math.floor(new Date(year, month - 1, day, 0, 0, 0).getTime() / 1000);
    const dayEnd = Math.floor(new Date(year, month - 1, day, 23, 59, 59, 999).getTime() / 1000);

    const conditions = [
      gte(user_activities.created_at, dayStart),
      lte(user_activities.created_at, dayEnd),
    ];
    if (userId) {
      conditions.push(eq(user_activities.user_id, userId));
    }

    const rows = db
      .select()
      .from(user_activities)
      .where(and(...conditions))
      .orderBy(desc(user_activities.created_at))
      .all();

    return rows.map((row) => {
      let meta: Record<string, any> | null = null;
      if (row.metadata_json) {
        try {
          meta = JSON.parse(row.metadata_json);
        } catch (e) {}
      }

      // Format contextual label: (Exercise/Concept - Subchapter - Workspace)
      let typeLabel = 'Activity';
      if (row.activity_type.includes('concept')) typeLabel = 'Concept';
      else if (row.activity_type.includes('exercise')) typeLabel = 'Exercise';
      else if (row.activity_type.includes('problem') || row.activity_type.includes('example')) typeLabel = 'Problem Example';
      else if (row.category === 'workspace') typeLabel = 'Workspace';
      else if (row.category === 'auth') typeLabel = 'Auth';

      const subchapter = meta?.subchapterCode || meta?.subchapterTitle || meta?.outlineCode || meta?.code || '';
      const workspace = meta?.projectName || meta?.projectSlug || 'Main Workspace';

      const contextParts = [typeLabel];
      if (subchapter) contextParts.push(subchapter);
      if (workspace) contextParts.push(workspace);

      const formattedContext = `(${contextParts.join(' - ')})`;

      return {
        id: row.id,
        activity_type: row.activity_type,
        category: row.category as ActivityCategory,
        title: row.title,
        description: row.description,
        formattedContext,
        created_at: row.created_at,
        metadata: meta,
      };
    });
  } catch (err) {
    console.error('Error fetching activities for date:', err);
    return [];
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
