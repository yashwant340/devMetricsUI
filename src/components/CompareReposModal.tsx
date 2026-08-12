import { useMemo, useState } from "react";
import type { Repo } from "../types/repo";

interface Props {
  repos: Repo[];
  selectedPrimaryId: string | null;
  selectedCompareId: string | null;
  onClose: () => void;
  onApply: (primaryId: string, compareId: string) => void;
}

export default function CompareReposModal({
  repos,
  selectedPrimaryId,
  selectedCompareId,
  onClose,
  onApply,
}: Props) {
  const [primaryId, setPrimaryId] = useState<string | null>(selectedPrimaryId);
  const [compareId, setCompareId] = useState<string | null>(selectedCompareId);
  const [primarySearch, setPrimarySearch] = useState("");
  const [compareSearch, setCompareSearch] = useState("");

  const primaryRepos = useMemo(
    () => filterRepos(repos, primarySearch),
    [primarySearch, repos],
  );
  const compareRepos = useMemo(
    () => filterRepos(repos, compareSearch),
    [compareSearch, repos],
  );

  const primaryRepo = repos.find((repo) => repo.id === primaryId) ?? null;
  const compareRepo = repos.find((repo) => repo.id === compareId) ?? null;
  const canCompare = Boolean(primaryId && compareId && primaryId !== compareId);
  const validationMessage = primaryId && compareId && primaryId === compareId
    ? "Choose two different repositories."
    : null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Compare repositories</div>
            <div style={styles.subtitle}>
              Pick a primary repo and a comparison repo from the same modal.
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <div style={styles.pickerColumn}>
            <div style={styles.pickerHeader}>
              <span style={styles.pickerTitle}>Primary repository</span>
              {primaryRepo && <span style={styles.pickerBadge}>Selected</span>}
            </div>
            <input
              type="text"
              placeholder="Search primary repo..."
              value={primarySearch}
              onChange={(event) => setPrimarySearch(event.target.value)}
              style={styles.searchInput}
              autoFocus
            />
            <div style={styles.repoList}>
              {primaryRepos.length === 0 ? (
                <EmptyHint label="No repos match that search." />
              ) : primaryRepos.map((repo) => (
                <RepoChoice
                  key={repo.id}
                  repo={repo}
                  active={repo.id === primaryId}
                  disabled={repo.id === compareId}
                  onClick={() => setPrimaryId(repo.id)}
                />
              ))}
            </div>
          </div>

          <div style={styles.pickerColumn}>
            <div style={styles.pickerHeader}>
              <span style={styles.pickerTitle}>Comparison repository</span>
              {compareRepo && <span style={styles.pickerBadgeAlt}>Selected</span>}
            </div>
            <input
              type="text"
              placeholder="Search comparison repo..."
              value={compareSearch}
              onChange={(event) => setCompareSearch(event.target.value)}
              style={styles.searchInput}
            />
            <div style={styles.repoList}>
              {compareRepos.length === 0 ? (
                <EmptyHint label="No repos match that search." />
              ) : compareRepos.map((repo) => (
                <RepoChoice
                  key={repo.id}
                  repo={repo}
                  active={repo.id === compareId}
                  disabled={repo.id === primaryId}
                  onClick={() => setCompareId(repo.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={styles.preview}>
          <div style={styles.previewLabel}>Current pair</div>
          <div style={styles.previewText}>
            {primaryRepo ? primaryRepo.name : "Choose a primary repo"}
            {" "}
            <span>vs</span>
            {" "}
            {compareRepo ? compareRepo.name : "Choose a comparison repo"}
          </div>
          {validationMessage && (
            <div style={styles.validation}>{validationMessage}</div>
          )}
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{
              ...styles.compareBtn,
              opacity: canCompare ? 1 : 0.5,
              cursor: canCompare ? "pointer" : "not-allowed",
            }}
            disabled={!canCompare}
            onClick={() => {
              if (primaryId && compareId && primaryId !== compareId) {
                onApply(primaryId, compareId);
              }
            }}
          >
            Compare repos
          </button>
        </div>
      </div>
    </div>
  );
}

function filterRepos(repos: Repo[], query: string): Repo[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return repos;
  return repos.filter((repo) =>
    repo.name.toLowerCase().includes(normalized) ||
    repo.ownerLogin.toLowerCase().includes(normalized),
  );
}

function RepoChoice({
  repo,
  active,
  disabled,
  onClick,
}: {
  repo: Repo;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.repoChoice,
        ...(active ? styles.repoChoiceActive : {}),
        ...(disabled ? styles.repoChoiceDisabled : {}),
      }}
      disabled={disabled}
      onClick={onClick}
    >
      <div style={styles.repoChoiceMain}>
        <div style={styles.repoChoiceName}>{repo.name}</div>
        <div style={styles.repoChoiceOwner}>{repo.ownerLogin}</div>
        {repo.description && (
          <div style={styles.repoChoiceDesc}>{repo.description}</div>
        )}
        <div style={styles.repoChoiceMeta}>
          {repo.language && <span style={styles.metaChip}>{repo.language}</span>}
          <span style={styles.metaChip}>★ {repo.starsCount}</span>
        </div>
      </div>
      <div style={{
        ...styles.radio,
        ...(active ? styles.radioActive : {}),
      }} />
    </button>
  );
}

function EmptyHint({ label }: { label: string }) {
  return <div style={styles.emptyHint}>{label}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.38)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: "16px",
  },
  modal: {
    width: "100%",
    maxWidth: "960px",
    maxHeight: "90vh",
    background: "#fff",
    borderRadius: "16px",
    border: "0.5px solid rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    padding: "18px 20px",
    borderBottom: "0.5px solid rgba(0,0,0,0.07)",
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#6b7280",
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    color: "#6b7280",
    fontSize: "14px",
    cursor: "pointer",
    padding: "4px",
  },
  body: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0",
    minHeight: 0,
    flex: 1,
  },
  pickerColumn: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  pickerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px 10px",
  },
  pickerTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
  },
  pickerBadge: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "999px",
    background: "#e0f2fe",
    color: "#0369a1",
  },
  pickerBadgeAlt: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "999px",
    background: "#f3e8ff",
    color: "#7c3aed",
  },
  searchInput: {
    margin: "0 18px 12px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "0.5px solid rgba(0,0,0,0.15)",
    fontSize: "13px",
    outline: "none",
  },
  repoList: {
    padding: "0 10px 10px",
    overflowY: "auto",
    flex: 1,
    display: "grid",
    gap: "8px",
  },
  repoChoice: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    textAlign: "left",
    padding: "12px",
    borderRadius: "12px",
    border: "0.5px solid rgba(0,0,0,0.08)",
    background: "#fff",
    cursor: "pointer",
  },
  repoChoiceActive: {
    borderColor: "#7c3aed",
    background: "#f5f3ff",
  },
  repoChoiceDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  repoChoiceMain: {
    flex: 1,
    minWidth: 0,
  },
  repoChoiceName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "2px",
  },
  repoChoiceOwner: {
    fontSize: "11px",
    color: "#6b7280",
    marginBottom: "6px",
  },
  repoChoiceDesc: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "8px",
    lineHeight: 1.45,
  },
  repoChoiceMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  metaChip: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "999px",
    background: "#f4f3ee",
    color: "#6b7280",
  },
  radio: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    border: "1.5px solid #d1d5db",
    background: "#fff",
    flexShrink: 0,
  },
  radioActive: {
    border: "5px solid #7c3aed",
  },
  emptyHint: {
    padding: "16px",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: "13px",
  },
  preview: {
    margin: "0 18px 12px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "0.5px solid rgba(124,58,237,0.18)",
    background: "#faf5ff",
  },
  previewLabel: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#7c3aed",
    marginBottom: "6px",
  },
  previewText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.45,
  },
  previewSeparator: {
    color: "#7c3aed",
    fontWeight: 700,
  },
  validation: {
    marginTop: "6px",
    fontSize: "12px",
    color: "#b91c1c",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    padding: "14px 18px 18px",
    borderTop: "0.5px solid rgba(0,0,0,0.07)",
  },
  cancelBtn: {
    padding: "8px 16px",
    fontSize: "13px",
    background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.15)",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#555",
  },
  compareBtn: {
    padding: "8px 18px",
    fontSize: "13px",
    fontWeight: 600,
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
  },
};
