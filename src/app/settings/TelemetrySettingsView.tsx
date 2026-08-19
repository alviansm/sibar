'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Activity,
  Calendar,
  Flame,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  FolderOpen,
  BookOpen,
  Trophy,
  CheckSquare,
  Clock,
  Sliders,
  Sparkles,
  Layers,
  FileText,
  AlertTriangle,
  Eye,
  X,
  TrendingUp,
} from 'lucide-react';
import {
  getTelemetryDashboardDataAction,
  exportTelemetryLogsAction,
  clearActivityLogsAction,
} from '@/app/actions/telemetry';
import { TelemetryOverviewData, ActivityCategory } from '@/lib/telemetry';
import { useToast } from '@/components/Toast';

interface TelemetrySettingsViewProps {
  initialOverview?: TelemetryOverviewData | null;
}

export function TelemetrySettingsView({ initialOverview }: TelemetrySettingsViewProps) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<TelemetryOverviewData | null>(initialOverview || null);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Loading & State
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [selectedLogMetadata, setSelectedLogMetadata] = useState<any | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearRetention, setClearRetention] = useState<number | 'all'>('all');
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load telemetry data
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      let startDate: number | null = null;
      const now = Math.floor(Date.now() / 1000);

      if (timeRange === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        startDate = Math.floor(startOfDay.getTime() / 1000);
      } else if (timeRange === '7d') {
        startDate = now - 7 * 86400;
      } else if (timeRange === '30d') {
        startDate = now - 30 * 86400;
      }

      const res = await getTelemetryDashboardDataAction({
        category: selectedCategory === 'all' ? null : selectedCategory,
        searchQuery: debouncedSearch || null,
        startDate,
        page,
        limit,
      });

      if (res.success && res.overview && res.logsData) {
        setOverview(res.overview);
        setLogs(res.logsData.logs || []);
        setTotal(res.logsData.total || 0);
        setTotalPages(res.logsData.totalPages || 1);
      } else if (res.error) {
        toast('Error', res.error, 'error');
      }
    } catch (e: any) {
      toast('Error', e.message || 'Failed to fetch telemetry data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, timeRange, debouncedSearch, page]);

  // Export logs
  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const res = await exportTelemetryLogsAction(format);
      if (res.success && res.content) {
        const blob = new Blob([res.content], {
          type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = res.filename || `telemetry.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast('Export Successful', `Successfully exported telemetry as ${format.toUpperCase()}`, 'success');
      } else {
        toast('Export Failed', res.error || 'Failed to export logs', 'error');
      }
    } catch (err: any) {
      toast('Export Error', err.message || 'Export error', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const retentionDays = clearRetention === 'all' ? undefined : clearRetention;
      const res = await clearActivityLogsAction(retentionDays);
      if (res.success) {
        toast('Activity Logs Cleared', res.message || 'Activity logs cleared.', 'success');
        setShowClearModal(false);
        fetchData();
      } else {
        toast('Clear Logs Failed', res.error || 'Failed to clear logs', 'error');
      }
    } catch (err: any) {
      toast('Error', err.message || 'Failed to clear logs', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Format relative time
  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    const d = new Date(timestamp * 1000);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Category Badge & Icon Map
  const getCategoryMeta = (category: string, activityType: string) => {
    switch (category) {
      case 'auth':
        return {
          icon: activityType === 'auth_logout' ? <LogOut className="w-4 h-4 text-rose-500" /> : <LogIn className="w-4 h-4 text-indigo-500" />,
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          borderColor: 'border-indigo-200 dark:border-indigo-800',
          label: 'Auth',
        };
      case 'workspace':
        return {
          icon: <FolderOpen className="w-4 h-4 text-sky-500" />,
          bgColor: 'bg-sky-50 dark:bg-sky-950/50',
          textColor: 'text-sky-700 dark:text-sky-300',
          borderColor: 'border-sky-200 dark:border-sky-800',
          label: 'Workspace',
        };
      case 'concept':
        return {
          icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
          textColor: 'text-emerald-700 dark:text-emerald-300',
          borderColor: 'border-emerald-200 dark:border-emerald-800',
          label: 'Concept',
        };
      case 'problem':
        return {
          icon: <Trophy className="w-4 h-4 text-amber-500" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950/50',
          textColor: 'text-amber-700 dark:text-amber-300',
          borderColor: 'border-amber-200 dark:border-amber-800',
          label: 'Problem Rep',
        };
      case 'exercise':
        return {
          icon: <CheckSquare className="w-4 h-4 text-purple-500" />,
          bgColor: 'bg-purple-50 dark:bg-purple-950/50',
          textColor: 'text-purple-700 dark:text-purple-300',
          borderColor: 'border-purple-200 dark:border-purple-800',
          label: 'Exercise',
        };
      case 'project':
        return {
          icon: <Layers className="w-4 h-4 text-teal-500" />,
          bgColor: 'bg-teal-50 dark:bg-teal-950/50',
          textColor: 'text-teal-700 dark:text-teal-300',
          borderColor: 'border-teal-200 dark:border-teal-800',
          label: 'Project',
        };
      case 'settings':
        return {
          icon: <Sliders className="w-4 h-4 text-slate-500" />,
          bgColor: 'bg-slate-100 dark:bg-slate-800',
          textColor: 'text-slate-700 dark:text-slate-300',
          borderColor: 'border-slate-200 dark:border-slate-700',
          label: 'Settings',
        };
      default:
        return {
          icon: <Activity className="w-4 h-4 text-slate-500" />,
          bgColor: 'bg-slate-100 dark:bg-slate-800',
          textColor: 'text-slate-700 dark:text-slate-300',
          borderColor: 'border-slate-200 dark:border-slate-700',
          label: category,
        };
    }
  };

  const categoriesList = [
    { id: 'all', label: 'All Activities' },
    { id: 'workspace', label: 'Workspaces' },
    { id: 'concept', label: 'Concepts' },
    { id: 'problem', label: 'Problems & Examples' },
    { id: 'exercise', label: 'Exercises' },
    { id: 'auth', label: 'Logins & Auth' },
    { id: 'project', label: 'Projects & Syllabus' },
    { id: 'settings', label: 'Settings' },
  ];

  // Maximum value for sparkline chart scaling
  const maxDailyCount = overview?.dailyTrend?.length
    ? Math.max(...overview.dailyTrend.map((d) => d.count), 1)
    : 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Top Header Summary & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Activity &amp; Telemetry Insights</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit log of user interactions, study sessions, concept mastery, and cognitive rep milestones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing || isLoading}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 shadow-sm transition-all"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={isExporting}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition-colors"
              >
                Export as JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition-colors"
              >
                Export as CSV
              </button>
            </div>
          </div>

          {/* Clear Logs Button */}
          <button
            onClick={() => setShowClearModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Activities */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Events</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {overview?.totalActivities || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Telemetry log count</span>
        </div>

        {/* Card 2: Workspace Visits */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider">Workspaces</span>
            <FolderOpen className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {overview?.workspaceVisitsCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Study workspace opens</span>
        </div>

        {/* Card 3: Concepts Mastered */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider">Concepts</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {overview?.conceptsMasteredCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Completed concept notes</span>
        </div>

        {/* Card 4: Solved Reps */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider">Solved Reps</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {overview?.problemsSolvedCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Clean problem solutions</span>
        </div>

        {/* Card 5: Completed Exercises */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider">Exercises</span>
            <CheckSquare className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {overview?.exercisesCompletedCount || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Finished exercise sets</span>
        </div>

        {/* Card 6: Active Streak */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider">Day Streak</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
            {overview?.activeStreakDays || 0} <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">{overview?.totalActiveDays || 0} total active days</span>
        </div>
      </div>

      {/* 14-Day Activity Bar Chart & Distribution */}
      {overview?.dailyTrend && overview.dailyTrend.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                14-Day Cognitive Activity Frequency
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Past 2 Weeks</span>
          </div>

          <div className="flex items-end gap-1.5 sm:gap-2 h-28 pt-4 pb-2 overflow-x-auto no-scrollbar">
            {overview.dailyTrend.map((item, idx) => {
              const heightPercent = Math.max(8, Math.round((item.count / maxDailyCount) * 100));
              const isToday = idx === overview.dailyTrend.length - 1;
              return (
                <div key={item.date} className="flex-1 min-w-[28px] flex flex-col items-center gap-1.5 h-full group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-7 px-2 py-0.5 rounded-lg bg-slate-900 text-white text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-md">
                    {item.count} events on {item.date}
                  </div>

                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[20px] rounded-t-lg transition-all duration-300 ${
                        item.count > 0
                          ? isToday
                            ? 'bg-indigo-600 dark:bg-indigo-500 shadow-sm shadow-indigo-500/30'
                            : 'bg-indigo-400/80 dark:bg-indigo-600/80 group-hover:bg-indigo-500'
                          : 'bg-slate-200 dark:bg-slate-700/60'
                      }`}
                    ></div>
                  </div>

                  <span className={`text-[9px] font-mono truncate ${isToday ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                    {item.dayLabel.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        {/* Category Horizontal Scroll Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
              {cat.id !== 'all' && overview?.categoryDistribution?.[cat.id] !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {overview.categoryDistribution[cat.id] || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search input & Time range buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions, titles, chapters..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            {(['all', 'today', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setTimeRange(r);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                  timeRange === r
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {r === 'all' && 'All Time'}
                {r === 'today' && 'Today'}
                {r === '7d' && '7 Days'}
                {r === '30d' && '30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Logs Timeline / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Activity Feed ({total} entries)
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
            <p className="text-xs">Loading telemetry records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 dark:bg-slate-850 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No activities found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No telemetry events match your selected category or filter query.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => {
              const meta = getCategoryMeta(log.category, log.activity_type);
              const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 sm:p-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-2xl ${meta.bgColor} ${meta.borderColor} border flex-shrink-0 mt-0.5 sm:mt-0`}>
                      {meta.icon}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${meta.bgColor} ${meta.textColor} ${meta.borderColor}`}>
                          {meta.label}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {log.title}
                        </h4>
                      </div>

                      {log.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {log.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                        {formatTimeAgo(log.created_at)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {new Date(log.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {hasMetadata && (
                      <button
                        onClick={() => setSelectedLogMetadata(log)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                        title="View raw JSON payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-medium text-slate-500">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedLogMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Activity Telemetry Metadata</h3>
              </div>
              <button
                onClick={() => setSelectedLogMetadata(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedLogMetadata.title}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Type: {selectedLogMetadata.activity_type} | Category: {selectedLogMetadata.category}
              </div>
              <div className="text-xs text-slate-500">
                Timestamp: {new Date(selectedLogMetadata.created_at * 1000).toLocaleString()}
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Structured Payload:</span>
                <pre className="mt-1 p-3 rounded-2xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-60 no-scrollbar">
                  {JSON.stringify(selectedLogMetadata.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLogMetadata(null)}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Logs Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Clear Activity Logs</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Choose the retention window to clear. This action will permanently remove telemetry logs from the database.
            </p>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <input
                  type="radio"
                  name="retention"
                  checked={clearRetention === 30}
                  onChange={() => setClearRetention(30)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Clear logs older than 30 days
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <input
                  type="radio"
                  name="retention"
                  checked={clearRetention === 'all'}
                  onChange={() => setClearRetention('all')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Clear ALL activity logs (Reset telemetry)
                </span>
              </label>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={isClearing}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Confirm Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
