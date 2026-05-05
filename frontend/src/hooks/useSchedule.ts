"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { usePolling } from "@/hooks/usePolling";
import { apiFetch } from "@/lib/api";
import type {
  Festival,
  FestivalSchedule,
  GroupFestival,
  Performance,
  PollResponse,
  ScheduleList,
  ScheduleStatus,
  UserSchedule,
} from "@/types";

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

interface ScheduleCache {
  festival: Festival;
  performances: Performance[];
  schedules: UserSchedule[];
}

function cacheKey(gfId: string): string {
  return `totem:schedule:${gfId}`;
}

function readCache(gfId: string): ScheduleCache | null {
  try {
    const raw = localStorage.getItem(cacheKey(gfId));
    return raw ? (JSON.parse(raw) as ScheduleCache) : null;
  } catch {
    return null;
  }
}

function writeCache(gfId: string, data: ScheduleCache): void {
  try {
    localStorage.setItem(cacheKey(gfId), JSON.stringify(data));
  } catch {}
}

export function useSchedule(gfId: string) {
  const { user } = useAuth();
  const [festival, setFestival] = useState<Festival | null>(null);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [schedules, setSchedules] = useState<UserSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    // Hydrate from cache immediately so the user never sees a blank screen
    const cached = readCache(gfId);
    if (cached) {
      setFestival(cached.festival);
      setPerformances(cached.performances);
      setSchedules(cached.schedules);
      setIsLoading(false);
    }

    try {
      const [gf, memberSchedules] = await Promise.all([
        apiFetch<GroupFestival>(`/api/v1/group-festivals/${gfId}`),
        apiFetch<ScheduleList>(`/api/v1/group-festivals/${gfId}/schedules`),
      ]);

      const scheduleData = await apiFetch<FestivalSchedule>(
        `/api/v1/festivals/${gf.festival_id}/schedule`,
      );

      setFestival(scheduleData.festival);
      setPerformances(scheduleData.performances);
      setSchedules(memberSchedules.data);
      setError(null);
      setLastSyncedAt(new Date());

      writeCache(gfId, {
        festival: scheduleData.festival,
        performances: scheduleData.performances,
        schedules: memberSchedules.data,
      });
    } catch {
      // If we served from cache, don't show an error — just keep cached data
      if (!cached) setError("Failed to load schedule");
    } finally {
      setIsLoading(false);
    }
  }, [gfId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const poll = useCallback(async () => {
    if (!lastSyncedAt) return;
    const since = lastSyncedAt.toISOString();
    const delta = await apiFetch<PollResponse>(
      `/api/v1/group-festivals/${gfId}/schedules/poll?since=${encodeURIComponent(since)}`,
    );
    if (delta.data.length > 0) {
      setSchedules((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        for (const s of delta.data) map.set(s.id, s);
        return Array.from(map.values());
      });

      // Merge delta into cached schedules so offline reads stay current
      const cached = readCache(gfId);
      if (cached) {
        const map = new Map(cached.schedules.map((s) => [s.id, s]));
        for (const s of delta.data) map.set(s.id, s);
        writeCache(gfId, { ...cached, schedules: Array.from(map.values()) });
      }
    }
    setLastSyncedAt(new Date());
  }, [gfId, lastSyncedAt]);

  usePolling(poll, POLL_INTERVAL_MS);

  const setStatus = async (performanceId: string, newStatus: ScheduleStatus): Promise<void> => {
    const existing = schedules.find(
      (s) => s.performance_id === performanceId && s.user_id === user?.id,
    );
    if (existing) {
      const updated = await apiFetch<UserSchedule>(
        `/api/v1/group-festivals/${gfId}/schedules/${existing.id}`,
        { method: "PATCH", body: { status: newStatus } },
      );
      setSchedules((prev) => prev.map((s) => (s.id === existing.id ? updated : s)));
    } else {
      const created = await apiFetch<UserSchedule>(`/api/v1/group-festivals/${gfId}/schedules`, {
        method: "POST",
        body: { performance_id: performanceId, status: newStatus },
      });
      setSchedules((prev) => [...prev, created]);
    }
  };

  const removeStatus = async (performanceId: string): Promise<void> => {
    const existing = schedules.find(
      (s) => s.performance_id === performanceId && s.user_id === user?.id,
    );
    if (!existing) return;
    await apiFetch(`/api/v1/group-festivals/${gfId}/schedules/${existing.id}`, {
      method: "DELETE",
    });
    setSchedules((prev) => prev.filter((s) => s.id !== existing.id));
  };

  return {
    festival,
    performances,
    schedules,
    isLoading,
    error,
    currentUserId: user?.id ?? "",
    lastSyncedAt,
    setStatus,
    removeStatus,
  };
}
