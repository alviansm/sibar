import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { projects, outlines, problems, problem_attempts, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getTelemetryOverview, getActivityLogs } from '@/lib/telemetry';
import { generateStudyIntelligenceAI, StudyIntelligenceContext } from '@/lib/gemini';
import { formatSecondsToHHMMSS } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const user = db.select().from(users).where(eq(users.id, session.userId)).get();
    const studentName = user?.full_name || user?.username || 'Scholar';

    // 1. Fetch Telemetry Overview
    const overview = await getTelemetryOverview(session.userId);

    // 2. Fetch Projects Summary
    const projectRows = db.select().from(projects).where(eq(projects.is_deleted, 0)).all();
    const projectsSummary = projectRows.map((proj) => {
      const projOutlines = db
        .select()
        .from(outlines)
        .where(and(eq(outlines.project_id, proj.id), eq(outlines.is_deleted, 0)))
        .all();

      const subchapters = projOutlines.filter((o) => o.parent_id !== null);
      const totalSubchapters = subchapters.length;
      const masteredSubchapters = subchapters.filter((s) => s.status === 'mastered').length;
      const progressPct = totalSubchapters > 0
        ? Math.round((masteredSubchapters / totalSubchapters) * 100)
        : 0;

      return {
        name: proj.name,
        targetMilestone: proj.target_milestone,
        progressPct,
        masteredSubchapters,
        totalSubchapters,
      };
    });

    // 3. Fetch Solved Reps and Study Time
    const allAttempts = db
      .select({
        id: problem_attempts.id,
        outcome: problem_attempts.outcome,
        time_spent_seconds: problem_attempts.time_spent_seconds,
      })
      .from(problem_attempts)
      .where(eq(problem_attempts.is_deleted, 0))
      .all();

    const totalReps = allAttempts.filter((a) => a.outcome === 'clean_solve').length;
    const totalSeconds = allAttempts.reduce((acc, curr) => acc + (curr.time_spent_seconds || 0), 0);
    const totalStudyTime = formatSecondsToHHMMSS(totalSeconds);
    const cleanSolveRate = allAttempts.length > 0
      ? Math.round((totalReps / allAttempts.length) * 100)
      : 0;

    // 4. Fetch Recent Activities
    const logsData = await getActivityLogs({
      userId: session.userId,
      limit: 20,
    });

    const recentActivities = logsData.logs.map((log) => ({
      title: log.title,
      category: log.category,
      activityType: log.activity_type,
      description: log.description,
      createdAtDate: new Date(log.created_at * 1000).toISOString(),
    }));

    // 5. Build Study Intelligence Context
    const context: StudyIntelligenceContext = {
      studentName,
      dayStreak: overview.activeStreakDays,
      weekStreak: overview.activeStreakWeeks || 0,
      totalActiveDays: overview.totalActiveDays,
      isTodayActive: overview.isTodayActive,
      totalReps,
      totalStudyTime,
      cleanSolveRate,
      projects: projectsSummary,
      recentActivities,
    };

    // Optional model override from body
    let modelName = 'gemini-3.6-flash';
    try {
      const body = await req.json();
      if (body?.modelName) modelName = body.modelName;
    } catch (e) {}

    const intelligence = await generateStudyIntelligenceAI(context, modelName);

    return NextResponse.json({
      success: true,
      intelligence,
    });
  } catch (error: any) {
    console.error('Error in study intelligence API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate study intelligence.' },
      { status: 500 }
    );
  }
}
