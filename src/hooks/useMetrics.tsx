import { useState, useEffect, useCallback } from "react";
import apiFetch from "./useApi";
import type { MetricsSnapshot } from "../types/metrics";

export function useLatestMetrics(repoId: string | null) {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!repoId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
  }, [repoId]);

  const fetch = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/metrics/${repoId}/latest`);
      if (res.status === 204) { setSnapshot(null); return; }
      if (!res.ok) throw new Error("Failed to load metrics");
      setSnapshot(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { snapshot, loading, error, refetch: fetch };
}

export function useMetricsHistory(
    repoId: string | null, days: number = 30) {

  const [history, setHistory]  = useState<MetricsSnapshot[]>([]);
  const [loading, setLoading]  = useState(false);

  const fetch = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    try {
      const res = await apiFetch(
          `/api/metrics/${repoId}/history?days=${days}`);
      if (!res.ok) throw new Error("Failed to load history");
      setHistory(await res.json());
    } finally {
      setLoading(false);
    }
  }, [repoId, days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { history, loading, refetch: fetch };
}
