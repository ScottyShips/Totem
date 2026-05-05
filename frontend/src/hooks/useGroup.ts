"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Group, GroupFestival, GroupFestivalList } from "@/types";

export function useGroup(groupId: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [festivals, setFestivals] = useState<GroupFestival[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [groupData, festivalData] = await Promise.all([
        apiFetch<Group>(`/api/v1/groups/${groupId}`),
        apiFetch<GroupFestivalList>(`/api/v1/groups/${groupId}/festivals`),
      ]);
      setGroup(groupData);
      setFestivals(festivalData.data);
      setError(null);
    } catch {
      setError("Failed to load group");
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const sendInvitation = async (phoneNumber: string): Promise<void> => {
    await apiFetch(`/api/v1/groups/${groupId}/invitations`, {
      method: "POST",
      body: { phone_number: phoneNumber },
    });
  };

  const linkFestival = async (festivalId: string): Promise<GroupFestival> => {
    const result = await apiFetch<GroupFestival>(`/api/v1/groups/${groupId}/festivals`, {
      method: "POST",
      body: { festival_id: festivalId },
    });
    setFestivals((prev) => [...prev, result]);
    return result;
  };

  return { group, festivals, isLoading, error, sendInvitation, linkFestival };
}
