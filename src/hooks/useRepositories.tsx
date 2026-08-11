import { useState, useEffect, useCallback, useRef } from "react";
import apiFetch from "./useApi";
import type { Repo, GitHubRepo } from "../types/repo";

export function useConnectedRepos() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/repositories");
      if (!res.ok) throw new Error("Failed to load repositories");
      const data: Repo[] = await res.json();
      setRepos(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  return { repos, loading, error, refetch: fetchRepos };
}

export function useAvailableRepos() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/repositories/available");
      if (!res.ok) throw new Error("Failed to fetch GitHub repos");
      const data: GitHubRepo[] = await res.json();
      setRepos(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { repos, loading, error, loadRepos: fetch };
}

export function useConnectRepo(onSuccess: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async (fullName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/repositories", {
        method: "POST",
        body: JSON.stringify({ fullName }),
      });
      if (res.status === 409) {
        setError("This repo is already connected");
        return;
      }
      if (!res.ok) throw new Error("Failed to connect repository");
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { connect, loading, error };
}

export function useDisconnectRepo(onSuccess: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = async (repoId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/repositories/${repoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || "Failed to disconnect repository");
      }
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { disconnect, loading, error };
}

export function useSyncRepo(onComplete: () => void) {
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const startedAtRef = useRef(new Map<string, number>());
  const timeoutIdsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const hadActiveSyncRef = useRef(false);

  const stopSyncing = useCallback((repoId: string) => {
    startedAtRef.current.delete(repoId);
    const timeoutId = timeoutIdsRef.current.get(repoId);
    if (timeoutId) clearTimeout(timeoutId);
    timeoutIdsRef.current.delete(repoId);
    setSyncing((current) => {
      const next = new Set(current);
      next.delete(repoId);
      return next;
    });
  }, []);

  // One poll checks every active sync. The previous design started one identical
  // GET /api/repositories interval for each repository being synced.
  useEffect(() => {
    if (syncing.size === 0) return;

    const poll = async () => {
      try {
        const res = await apiFetch("/api/repositories");
        if (!res.ok) throw new Error("Failed to poll repositories");
        const repos: Repo[] = await res.json();

        syncing.forEach((repoId) => {
          const repo = repos.find((item) => item.id === repoId);
          const startedAt = startedAtRef.current.get(repoId);
          if (repo?.lastSyncedAt && startedAt) {
            // A timestamp close to the start time can be from the sync just requested.
            if (new Date(repo.lastSyncedAt).getTime() >= startedAt - 5000) {
              stopSyncing(repoId);
            }
          }
        });
      } catch {
        syncing.forEach(stopSyncing);
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [syncing, stopSyncing]);

  // Refresh dashboard data once after the final active sync completes.
  useEffect(() => {
    if (syncing.size > 0) {
      hadActiveSyncRef.current = true;
    } else if (hadActiveSyncRef.current) {
      hadActiveSyncRef.current = false;
      onComplete();
    }
  }, [syncing, onComplete]);

  useEffect(() => () => {
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
  }, []);

  const sync = async (repoId: string) => {
    if (syncing.has(repoId)) return;
    setSyncing(prev => new Set(prev).add(repoId));
    startedAtRef.current.set(repoId, Date.now());

    try {
      const res = await apiFetch(`/api/sync/${repoId}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start repository sync");
      timeoutIdsRef.current.set(repoId, setTimeout(() => stopSyncing(repoId), 180000));
    } catch {
      stopSyncing(repoId);
    }
  };

  return { sync, syncing };
}
