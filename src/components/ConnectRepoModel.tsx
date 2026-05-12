import { useState, useEffect } from "react";
import type { GitHubRepo } from "../types/repo";
import { useAvailableRepos, useConnectRepo } from "../hooks/useRepositories";

interface Props {
  onClose: () => void;
  onConnected: () => void;
}

export default function ConnectRepoModal({ onClose, onConnected }: Props) {
  const { repos, loading: loadingRepos, loadRepos } = useAvailableRepos();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GitHubRepo | null>(null);

  const { connect, loading: connecting, error } = useConnectRepo(() => {
    onConnected();
    onClose();
  });

  useEffect(() => { loadRepos(); }, []);

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>Connect a repository</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div style={styles.searchWrap}>
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
            autoFocus
          />
        </div>

        {/* Repo list */}
        <div style={styles.list}>
          {loadingRepos ? (
            <div style={styles.centered}>
              <Spinner />
              <span style={styles.hint}>Loading your GitHub repos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={styles.centered}>
              <span style={styles.hint}>No repos found</span>
            </div>
          ) : (
            filtered.map((repo) => (
              <div
                key={repo.id}
                style={{
                  ...styles.repoRow,
                  ...(selected?.id === repo.id ? styles.repoRowSelected : {}),
                }}
                onClick={() => setSelected(
                  selected?.id === repo.id ? null : repo
                )}
              >
                <div style={styles.repoMain}>
                  <div style={styles.repoName}>
                    {repo.private && (
                      <span style={styles.privateBadge}>Private</span>
                    )}
                    {repo.full_name}
                  </div>
                  {repo.description && (
                    <div style={styles.repoDesc}>{repo.description}</div>
                  )}
                  <div style={styles.repometa}>
                    {repo.language && (
                      <span style={styles.metaItem}>{repo.language}</span>
                    )}
                    <span style={styles.metaItem}>
                      ★ {repo.stargazers_count}
                    </span>
                  </div>
                </div>
                <div style={styles.radioWrap}>
                  <div style={{
                    ...styles.radio,
                    ...(selected?.id === repo.id ? styles.radioActive : {}),
                  }} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error */}
        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.connectBtn,
              opacity: selected && !connecting ? 1 : 0.5,
              cursor: selected && !connecting ? "pointer" : "not-allowed",
            }}
            disabled={!selected || connecting}
            onClick={() => selected && connect(selected.full_name)}
          >
            {connecting ? "Connecting..." : "Connect repository"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: "20px", height: "20px",
      border: "2px solid #e5e5e5",
      borderTop: "2px solid #1a1a1a",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed" as const, inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 50,
  },
  modal: {
    background: "#fff", borderRadius: "14px",
    width: "100%", maxWidth: "520px",
    maxHeight: "80vh", display: "flex", flexDirection: "column",
    border: "0.5px solid rgba(0,0,0,0.1)",
  },
  header: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "0.5px solid rgba(0,0,0,0.07)",
  },
  title: { fontSize: "15px", fontWeight: 500, color: "#1a1a1a" },
  closeBtn: {
    background: "transparent", border: "none",
    fontSize: "14px", color: "#999", cursor: "pointer", padding: "4px",
  },
  searchWrap: { padding: "12px 16px",
    borderBottom: "0.5px solid rgba(0,0,0,0.07)" },
  searchInput: {
    width: "100%", boxSizing: "border-box" as const,
    padding: "8px 12px", fontSize: "13px",
    border: "0.5px solid rgba(0,0,0,0.15)",
    borderRadius: "8px", outline: "none",
  },
  list: { flex: 1, overflowY: "auto" as const, padding: "8px 0" },
  centered: {
    display: "flex", flexDirection: "column" as const,
    alignItems: "center", justifyContent: "center",
    gap: "10px", padding: "2rem",
  },
  hint: { fontSize: "13px", color: "#aaa" },
  repoRow: {
    display: "flex", alignItems: "center",
    padding: "12px 20px", cursor: "pointer",
    borderBottom: "0.5px solid rgba(0,0,0,0.04)",
    transition: "background 0.1s",
  },
  repoRowSelected: { background: "#f0f7ff" },
  repoMain: { flex: 1 },
  repoName: {
    fontSize: "13px", fontWeight: 500, color: "#1a1a1a",
    display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px",
  },
  privateBadge: {
    fontSize: "10px", padding: "1px 6px",
    background: "#f4f3ee", color: "#888", borderRadius: "4px",
  },
  repoDesc: {
    fontSize: "12px", color: "#999",
    marginBottom: "5px", lineHeight: "1.4",
  },
  repometa: { display: "flex", gap: "12px" },
  metaItem: { fontSize: "11px", color: "#bbb" },
  radioWrap: { paddingLeft: "12px" },
  radio: {
    width: "16px", height: "16px", borderRadius: "50%",
    border: "1.5px solid #ddd", background: "#fff",
  },
  radioActive: { border: "5px solid #1a1a1a" },
  errorBanner: {
    margin: "0 16px", padding: "8px 12px",
    background: "#fef2f2", border: "0.5px solid #fca5a5",
    borderRadius: "6px", fontSize: "12px", color: "#b91c1c",
  },
  footer: {
    display: "flex", justifyContent: "flex-end", gap: "8px",
    padding: "14px 20px", borderTop: "0.5px solid rgba(0,0,0,0.07)",
  },
  cancelBtn: {
    padding: "8px 16px", fontSize: "13px", background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.15)", borderRadius: "7px",
    cursor: "pointer", color: "#555",
  },
  connectBtn: {
    padding: "8px 18px", fontSize: "13px", fontWeight: 500,
    background: "#1a1a1a", color: "#fff",
    border: "none", borderRadius: "7px",
  },
};