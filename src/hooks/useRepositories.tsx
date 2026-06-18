import { useState, useEffect, useCallback } from "react";
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

  const disconnect = async (repoId: string) => {
    setLoading(true);
    try {
      await apiFetch(`/api/repositories/${repoId}`, { method: "DELETE" });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return { disconnect, loading };
}

export function useSyncRepo(onComplete: () => void) {
  const [syncing, setSyncing] = useState<Set<string>>(new Set());

  const sync = async (repoId: string) => {
    // Mark this repo as syncing
    setSyncing(prev => new Set(prev).add(repoId));

    try {
      await apiFetch(`/api/sync/${repoId}`, { method: "POST" });

      // Poll every 3 seconds to check if sync completed
      const interval = setInterval(async () => {
        try {
          const res = await apiFetch(`/api/repositories`);
          const repos: Repo[] = await res.json();
          const repo = repos.find(r => r.id === repoId);

          // If lastSyncedAt updated, sync is done
          if (repo?.lastSyncedAt) {
            const syncedAt = new Date(repo.lastSyncedAt).getTime();
            const fiveSecsAgo = Date.now() - 5000;

            if (syncedAt > fiveSecsAgo) {
              clearInterval(interval);
              setSyncing(prev => {
                const next = new Set(prev);
                next.delete(repoId);
                return next;
              });
              onComplete();
            }
          }
        } catch {
          clearInterval(interval);
          setSyncing(prev => {
            const next = new Set(prev);
            next.delete(repoId);
            return next;
          });
        }
      }, 3000);

      // Safety timeout — stop polling after 3 minutes
      setTimeout(() => {
        clearInterval(interval);
        setSyncing(prev => {
          const next = new Set(prev);
          next.delete(repoId);
          return next;
        });
        onComplete();
      }, 180000);

    } catch {
      setSyncing(prev => {
        const next = new Set(prev);
        next.delete(repoId);
        return next;
      });
    }
  };

  return { sync, syncing };
}