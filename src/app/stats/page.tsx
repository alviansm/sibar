import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getTelemetryOverview, getActivitiesForDate } from '@/lib/telemetry';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WorkspaceTracker } from '@/components/WorkspaceTracker';
import { StatsWorkspace } from './StatsWorkspace';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function StatisticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const overview = await getTelemetryOverview(user.id);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const initialActivities = await getActivitiesForDate(user.id, todayStr);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <WorkspaceTracker
        workspaceType="stats"
        title="Viewed Study Statistics"
        description="Explored habit streak calendar and daily activity breakdown."
      />
      <Navbar username={user.username} fullName={user.fullName} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsWorkspace
          initialOverview={overview}
          initialSelectedDate={todayStr}
          initialDayActivities={initialActivities}
        />
      </main>

      <Footer />
    </div>
  );
}
