"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Group, GroupList } from "@/types";

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const result = await apiFetch<GroupList>("/api/v1/groups");
      setGroups(result.data);
      setError(null);
    } catch {
      setError("Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string): Promise<Group> => {
    const group = await apiFetch<Group>("/api/v1/groups", {
      method: "POST",
      body: { name },
    });
    setGroups((prev) => [...prev, group]);
    return group;
  };

  return { groups, isLoading, error, createGroup };
}
