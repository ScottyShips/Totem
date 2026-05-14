import type { Performance, UserSchedule } from "@/types";

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  // Strict overlap — touching ranges (A ends exactly when B starts) don't conflict.
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

function hasTimes(p: Performance): p is Performance & { start_time: string; end_time: string } {
  return p.start_time !== null && p.end_time !== null;
}

/**
 * For a given user, returns a map from performanceId → list of OTHER performances
 * the user is also "attending" that overlap in time. Only "attending" entries are
 * considered; "maybe" and "skipping" don't count toward conflicts. Performances
 * with TBD times are skipped — we can't detect a conflict against an unknown slot.
 */
export function computeUserConflicts(
  performances: Performance[],
  schedules: UserSchedule[],
  userId: string,
): Map<string, Performance[]> {
  const result = new Map<string, Performance[]>();
  if (!userId) return result;

  const perfById = new Map(performances.map((p) => [p.id, p]));
  const attending: Performance[] = [];
  for (const s of schedules) {
    if (s.user_id !== userId || s.status !== "attending") continue;
    const p = perfById.get(s.performance_id);
    if (p && hasTimes(p)) attending.push(p);
  }

  for (let i = 0; i < attending.length; i++) {
    for (let j = i + 1; j < attending.length; j++) {
      const a = attending[i];
      const b = attending[j];
      if (rangesOverlap(a.start_time!, a.end_time!, b.start_time!, b.end_time!)) {
        if (!result.has(a.id)) result.set(a.id, []);
        if (!result.has(b.id)) result.set(b.id, []);
        result.get(a.id)!.push(b);
        result.get(b.id)!.push(a);
      }
    }
  }

  return result;
}

/**
 * Returns the OTHER attending performances that overlap with the given performance.
 * Used by StatusSheet to warn before/while marking attending. Returns empty if
 * the given performance has TBD times (no slot to compare against).
 */
export function findConflictsFor(
  performance: Performance,
  performances: Performance[],
  schedules: UserSchedule[],
  userId: string,
): Performance[] {
  if (!userId) return [];
  if (!hasTimes(performance)) return [];
  const perfById = new Map(performances.map((p) => [p.id, p]));
  const result: Performance[] = [];
  for (const s of schedules) {
    if (s.user_id !== userId || s.status !== "attending") continue;
    if (s.performance_id === performance.id) continue;
    const other = perfById.get(s.performance_id);
    if (!other || !hasTimes(other)) continue;
    if (rangesOverlap(performance.start_time, performance.end_time, other.start_time, other.end_time)) {
      result.push(other);
    }
  }
  return result;
}
