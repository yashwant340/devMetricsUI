import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Repo } from "../types/repo";
import { useConnectedRepos, useDisconnectRepo } from "../hooks/useRepositories";
import ConnectRepoModal from "../components/ConnectRepoModel";

export default function Dashboard() {
  const navigate = useNavigate();
  const { repos, loading, refetch } = useConnectedRepos();
  const [showModal, setShowModal] = useState(false);
  const { disconnect } = useDisconnectRepo(refetch);

  const handleLogout = async () => {
    await fetch("http://localhost:8080/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    navigate("/login", { replace: true });
  };

  return (
    <div style={styles.page}>
      {/* Navbar */}
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
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Log out
        </button>
      </nav>

      <main style={styles.main}>
        {/* Metric cards */}
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

        {/* Repositories panel */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Repositories</span>
            <button
              style={styles.connectBtn}
              onClick={() => setShowModal(true)}
            >
              + Connect repo
            </button>
          </div>

          {loading ? (
            <div style={styles.centered}>
              <Spinner />
            </div>
          ) : repos.length === 0 ? (
            <EmptyState onConnect={() => setShowModal(true)} />
          ) : (
            <div>
              {repos.map((repo) => (
                <RepoRow
                  key={repo.id}
                  repo={repo}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RepoRow({
  repo,
  onDisconnect,
}: {
  repo: Repo;
  onDisconnect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={styles.repoRow}>
      <div style={styles.repoInfo}>
        <div style={styles.repoName}>
          {repo.isPrivate && (
            <span style={styles.privateBadge}>Private</span>
          )}
          {repo.fullName}
        </div>
        {repo.description && (
          <div style={styles.repoDesc}>{repo.description}</div>
        )}
        <div style={styles.repoMeta}>
          {repo.language && (
            <span style={styles.metaChip}>{repo.language}</span>
          )}
          <span style={styles.metaChip}>★ {repo.starsCount}</span>
          <span style={styles.metaChip}>
            {repo.defaultBranch}
          </span>
          {repo.lastSyncedAt ? (
            <span style={styles.metaChip}>
              Synced {new Date(repo.lastSyncedAt).toLocaleDateString()}
            </span>
          ) : (
            <span style={{ ...styles.metaChip, color: "#f59e0b" }}>
              Sync pending
            </span>
          )}
        </div>
      </div>

      <div>
        {confirming ? (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              style={styles.confirmBtn}
              onClick={() => { onDisconnect(); setConfirming(false); }}
            >
              Disconnect
            </button>
            <button
              style={styles.cancelBtn}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            style={styles.disconnectBtn}
            onClick={() => setConfirming(true)}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

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

function Spinner() {
  return (
    <div style={{
      width: "22px", height: "22px",
      border: "2px solid #e5e5e5", borderTop: "2px solid #1a1a1a",
      borderRadius: "50%", animation: "spin 0.8s linear infinite",
    }} />
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#f9f9f7",
    fontFamily: "system-ui, -apple-system, sans-serif" },
  nav: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem", height: "56px",
    background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.08)",
  },
  navLeft: { display: "flex", alignItems: "center", gap: "10px" },
  navBrand: { fontSize: "15px", fontWeight: 500, color: "#1a1a1a" },
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
  panelTitle: { fontSize: "14px", fontWeight: 500, color: "#1a1a1a" },
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
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 1.25rem",
    borderBottom: "0.5px solid rgba(0,0,0,0.05)",
  },
  repoInfo: { flex: 1 },
  repoName: {
    fontSize: "14px", fontWeight: 500, color: "#1a1a1a",
    display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px",
  },
  privateBadge: {
    fontSize: "10px", padding: "1px 6px",
    background: "#f4f3ee", color: "#888", borderRadius: "4px",
  },
  repoDesc: {
    fontSize: "12px", color: "#999",
    marginBottom: "6px", lineHeight: "1.4",
  },
  repoMeta: { display: "flex", gap: "8px", flexWrap: "wrap" },
  metaChip: {
    fontSize: "11px", padding: "2px 8px",
    background: "#f4f3ee", color: "#888", borderRadius: "20px",
  },
  disconnectBtn: {
    fontSize: "12px", padding: "5px 12px", background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "6px",
    cursor: "pointer", color: "#999",
  },
  confirmBtn: {
    fontSize: "12px", padding: "5px 12px",
    background: "#fee2e2", color: "#b91c1c",
    border: "0.5px solid #fca5a5", borderRadius: "6px", cursor: "pointer",
  },
  cancelBtn: {
    fontSize: "12px", padding: "5px 12px", background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.12)", borderRadius: "6px",
    cursor: "pointer", color: "#999",
  },
  emptyState: {
    display: "flex", flexDirection: "column",
    alignItems: "center", padding: "3rem 1rem", gap: "12px",
  },
  emptyText: {
    fontSize: "13px", color: "#bbb", margin: 0, textAlign: "center",
  },
  emptyConnectBtn: {
    fontSize: "13px", padding: "8px 18px",
    background: "#1a1a1a", color: "#fff",
    border: "none", borderRadius: "7px", cursor: "pointer",
  },
};