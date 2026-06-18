import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useConnectedRepos,
  useDisconnectRepo,
  useSyncRepo,
} from "../hooks/useRepositories";
import type { Repo } from "../types/repo";
import ConnectRepoModal from "../components/ConnectRepoModel";

export default function Dashboard() {
  const navigate = useNavigate();
  const { repos, loading, refetch } = useConnectedRepos();
  const [showModal, setShowModal] = useState(false);
  const { disconnect } = useDisconnectRepo(refetch);
  const { sync, syncing } = useSyncRepo(refetch);

  const handleLogout = async () => {
    await fetch("http://localhost:8080/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    navigate("/login", { replace: true });
  };

  const anySyncing = syncing.size > 0;

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="#1a1a1a"/>
            <path d="M10 26 L18 10 L26 26" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M13 21 L23 21" stroke="white" strokeWidth="2"
              strokeLinecap="round"/>
          </svg>
          <span style={styles.navBrand}>DevMetrics</span>
        </div>
        <div style={styles.navRight}>
          {/* Global sync indicator in navbar */}
          {anySyncing && (
            <div style={styles.navSyncBadge}>
              <SpinnerIcon size={12} color="#b45309" />
              <span>Syncing {syncing.size} repo{syncing.size > 1 ? "s" : ""}...</span>
            </div>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.metricsGrid}>
          {[
            { label: "Connected repos", value: repos.length },
            { label: "Avg merge time",  value: "—" },
            { label: "Open PRs",        value: "—" },
            { label: "Health score",    value: "—" },
          ].map((m) => (
            <div key={m.label} style={styles.metricCard}>
              <div style={styles.metricLabel}>{m.label}</div>
              <div style={styles.metricValue}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelHeaderLeft}>
              <span style={styles.panelTitle}>Repositories</span>
              {anySyncing && (
                <span style={styles.panelSyncNote}>
                  sync in progress — this may take a moment
                </span>
              )}
            </div>
            <div style={styles.panelHeaderRight}>
              {/* Sync all button */}
              {repos.length > 0 && (
                <button
                  style={{
                    ...styles.syncAllBtn,
                    opacity: anySyncing ? 0.5 : 1,
                    cursor: anySyncing ? "not-allowed" : "pointer",
                  }}
                  disabled={anySyncing}
                  onClick={() => repos.forEach(r => sync(r.id))}
                >
                  {anySyncing ? "Syncing..." : "↻ Sync all"}
                </button>
              )}
              <button
                style={styles.connectBtn}
                onClick={() => setShowModal(true)}
              >
                + Connect repo
              </button>
            </div>
          </div>

          {loading ? (
            <div style={styles.centered}>
              <SpinnerIcon size={22} color="#1a1a1a" />
            </div>
          ) : repos.length === 0 ? (
            <EmptyState onConnect={() => setShowModal(true)} />
          ) : (
            <div>
              {repos.map((repo) => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
                  isSyncing={syncing.has(repo.id)}
                  onSync={() => sync(repo.id)}
                  onDisconnect={() => disconnect(repo.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <ConnectRepoModal
          onClose={() => setShowModal(false)}
          onConnected={refetch}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

// ── RepoRow ────────────────────────────────────────────────────────────────

function RepoRow({
  repo,
  isSyncing,
  onSync,
  onDisconnect,
}: {
  repo: Repo;
  isSyncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{
      ...styles.repoRow,
      background: isSyncing ? "#fffbeb" : "transparent",
      transition: "background 0.3s",
    }}>

      {/* Left — repo info */}
      <div style={styles.repoInfo}>
        <div style={styles.repoName}>
          {repo.isPrivate && (
            <span style={styles.privateBadge}>Private</span>
          )}
          <span>{repo.fullName}</span>
          {/* Inline syncing indicator next to repo name */}
          {isSyncing && (
            <span style={styles.syncingPill}>
              <SpinnerIcon size={10} color="#b45309" />
              syncing...
            </span>
          )}
        </div>

        {repo.description && (
          <div style={styles.repoDesc}>{repo.description}</div>
        )}

        <div style={styles.repoMeta}>
          {repo.language && (
            <span style={styles.metaChip}>{repo.language}</span>
          )}
          <span style={styles.metaChip}>★ {repo.starsCount}</span>
          <span style={styles.metaChip}>{repo.defaultBranch}</span>

          {/* Last synced timestamp */}
          {isSyncing ? (
            <span style={{ ...styles.metaChip, ...styles.syncingChip }}>
              syncing now...
            </span>
          ) : repo.lastSyncedAt ? (
            <span style={{ ...styles.metaChip, ...styles.syncedChip }}>
              ✓ synced {timeAgo(repo.lastSyncedAt)}
            </span>
          ) : (
            <span style={{ ...styles.metaChip, ...styles.neverSyncedChip }}>
              never synced
            </span>
          )}
        </div>

        {/* Progress bar shown while syncing */}
        {isSyncing && (
          <div style={styles.progressWrap}>
            <div style={styles.progressBar} />
          </div>
        )}
      </div>

      {/* Right — actions */}
      <div style={styles.actions}>
        <button
          style={{
            ...styles.syncBtn,
            opacity: isSyncing ? 0.4 : 1,
            cursor: isSyncing ? "not-allowed" : "pointer",
          }}
          onClick={onSync}
          disabled={isSyncing}
          title="Sync PRs and commits from GitHub"
        >
          {isSyncing
            ? <><SpinnerIcon size={11} color="#555" /> syncing</>
            : "↻ Sync"
          }
        </button>

        {confirming ? (
          <>
            <button
              style={styles.confirmBtn}
              onClick={() => { onDisconnect(); setConfirming(false); }}
            >
              Confirm
            </button>
            <button
              style={styles.cancelBtn}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            style={styles.disconnectBtn}
            onClick={() => setConfirming(true)}
            disabled={isSyncing}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div style={styles.emptyState}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
        stroke="#ddd" strokeWidth="1" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
      <p style={styles.emptyText}>
        Connect your first GitHub repo to start tracking metrics
      </p>
      <button style={styles.emptyConnectBtn} onClick={onConnect}>
        Connect a repository
      </button>
    </div>
  );
}

// ── SpinnerIcon ────────────────────────────────────────────────────────────

function SpinnerIcon({ size, color }: { size: number; color: string }) {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      border: `${Math.max(1, size / 8)}px solid ${color}22`,
      borderTop: `${Math.max(1, size / 8)}px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      flexShrink: 0,
    }} />
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh", backgroundColor: "#f9f9f7",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  nav: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem", height: "56px",
    background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.08)",
  },
  navLeft: { display: "flex", alignItems: "center", gap: "10px" },
  navBrand: { fontSize: "15px", fontWeight: 500, color: "#1a1a1a" },
  navRight: { display: "flex", alignItems: "center", gap: "12px" },
  navSyncBadge: {
    display: "flex", alignItems: "center", gap: "6px",
    fontSize: "12px", color: "#b45309",
    background: "#fffbeb", border: "0.5px solid #fcd34d",
    borderRadius: "20px", padding: "4px 10px",
    animation: "pulse 2s ease-in-out infinite",
  },
  logoutBtn: {
    fontSize: "13px", padding: "6px 14px", background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.15)",
    borderRadius: "6px", cursor: "pointer", color: "#555",
  },
  main: { maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem" },
  metricsGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: "12px", marginBottom: "1.5rem",
  },
  metricCard: {
    background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: "10px", padding: "1rem",
  },
  metricLabel: { fontSize: "12px", color: "#aaa", marginBottom: "6px" },
  metricValue: { fontSize: "24px", fontWeight: 500, color: "#1a1a1a" },
  panel: {
    background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: "12px", overflow: "hidden",
  },
  panelHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 1.25rem",
    borderBottom: "0.5px solid rgba(0,0,0,0.06)",
  },
  panelHeaderLeft: { display: "flex", alignItems: "center", gap: "10px" },
  panelHeaderRight: { display: "flex", alignItems: "center", gap: "8px" },
  panelTitle: { fontSize: "14px", fontWeight: 500, color: "#1a1a1a" },
  panelSyncNote: { fontSize: "12px", color: "#b45309" },
  syncAllBtn: {
    fontSize: "12px", padding: "6px 12px", background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.15)",
    borderRadius: "6px", color: "#555",
  },
  connectBtn: {
    fontSize: "13px", padding: "7px 14px",
    background: "#1a1a1a", color: "#fff",
    border: "none", borderRadius: "7px", cursor: "pointer",
  },
  centered: {
    display: "flex", justifyContent: "center",
    alignItems: "center", padding: "3rem",
  },
  repoRow: {
    display: "flex", alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "14px 1.25rem",
    borderBottom: "0.5px solid rgba(0,0,0,0.05)",
  },
  repoInfo: { flex: 1 },
  repoName: {
    fontSize: "14px", fontWeight: 500, color: "#1a1a1a",
    display: "flex", alignItems: "center",
    gap: "6px", marginBottom: "3px", flexWrap: "wrap",
  },
  privateBadge: {
    fontSize: "10px", padding: "1px 6px",
    background: "#f4f3ee", color: "#888", borderRadius: "4px",
  },
  syncingPill: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "11px", padding: "2px 8px",
    background: "#fffbeb", color: "#b45309",
    border: "0.5px solid #fcd34d", borderRadius: "20px",
  },
  repoDesc: {
    fontSize: "12px", color: "#999",
    marginBottom: "6px", lineHeight: "1.4",
  },
  repoMeta: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" },
  metaChip: {
    fontSize: "11px", padding: "2px 8px",
    background: "#f4f3ee", color: "#888", borderRadius: "20px",
  },
  syncingChip: {
    background: "#fffbeb", color: "#b45309",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  syncedChip: { background: "#f0fdf4", color: "#16a34a" },
  neverSyncedChip: { background: "#fffbeb", color: "#d97706" },
  progressWrap: {
    height: "3px", background: "#f4f3ee",
    borderRadius: "2px", overflow: "hidden",
    marginTop: "6px", width: "100%",
  },
  progressBar: {
    height: "100%", width: "40%",
    background: "#f59e0b", borderRadius: "2px",
    animation: "progress 1.5s ease-in-out infinite alternate",
  },
  actions: {
    display: "flex", gap: "6px",
    alignItems: "center", paddingLeft: "12px", flexShrink: 0,
  },
  syncBtn: {
    display: "inline-flex", alignItems: "center", gap: "5px",
    fontSize: "12px", padding: "5px 12px", background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.15)",
    borderRadius: "6px", color: "#555",
  },
  disconnectBtn: {
    fontSize: "12px", padding: "5px 12px", background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: "6px", cursor: "pointer", color: "#bbb",
  },
  confirmBtn: {
    fontSize: "12px", padding: "5px 12px",
    background: "#fee2e2", color: "#b91c1c",
    border: "0.5px solid #fca5a5", borderRadius: "6px", cursor: "pointer",
  },
  cancelBtn: {
    fontSize: "12px", padding: "5px 12px", background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: "6px", cursor: "pointer", color: "#999",
  },
  emptyState: {
    display: "flex", flexDirection: "column",
    alignItems: "center", padding: "3rem 1rem", gap: "12px",
  },
  emptyText: { fontSize: "13px", color: "#bbb", margin: 0, textAlign: "center" },
  emptyConnectBtn: {
    fontSize: "13px", padding: "8px 18px",
    background: "#1a1a1a", color: "#fff",
    border: "none", borderRadius: "7px", cursor: "pointer",
  },
};