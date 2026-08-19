'use client';

import { useEffect, useRef } from 'react';
import { logClientActivityAction } from '@/app/actions/telemetry';

interface WorkspaceTrackerProps {
  workspaceType: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export function WorkspaceTracker({
  workspaceType,
  title,
  description,
  metadata = {},
}: WorkspaceTrackerProps) {
  const hasLogged = useRef(false);

  useEffect(() => {
    if (hasLogged.current) return;

    // Debounce duplicate tracking on rapid remounts
    const storageKey = `sibar_last_ws_${workspaceType}_${metadata.slug || ''}_${metadata.outlineId || ''}_${metadata.conceptId || ''}_${metadata.exerciseId || ''}`;
    const lastLoggedTime = sessionStorage.getItem(storageKey);
    const now = Date.now();

    if (lastLoggedTime && now - parseInt(lastLoggedTime, 10) < 15000) {
      // Logged within the last 15 seconds, skip duplicate
      return;
    }

    hasLogged.current = true;
    sessionStorage.setItem(storageKey, String(now));

    logClientActivityAction({
      activityType: 'workspace_open',
      category: 'workspace',
      title,
      description,
      metadata: {
        workspaceType,
        ...metadata,
      },
    }).catch(() => {
      // Non-blocking
    });
  }, [workspaceType, title, description, metadata]);

  return null;
}
