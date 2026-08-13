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
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.42), rgba(15,23,42,0.5))",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: "20px",
  },
  modal: {
    width: "100%",
    maxWidth: "1040px",
    maxHeight: "90vh",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(18px)",
    borderRadius: "24px",
    border: "1px solid rgba(148,163,184,0.18)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 30px 100px rgba(15,23,42,0.18)",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    padding: "20px 22px",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
  },
  title: {
    fontSize: "17px",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "5px",
  },
  subtitle: {
    fontSize: "12px",
    color: "#64748b",
  },
  closeBtn: {
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(255,255,255,0.88)",
    color: "#64748b",
    fontSize: "14px",
    cursor: "pointer",
    padding: "8px 10px",
    borderRadius: "999px",
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
    padding: "16px 18px 10px",
  },
  pickerTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#0f172a",
  },
  pickerBadge: {
    fontSize: "11px",
    padding: "4px 9px",
    borderRadius: "999px",
    background: "rgba(224,242,254,0.9)",
    color: "#0369a1",
  },
  pickerBadgeAlt: {
    fontSize: "11px",
    padding: "4px 9px",
    borderRadius: "999px",
    background: "rgba(243,232,255,0.9)",
    color: "#7c3aed",
  },
  searchInput: {
    margin: "0 18px 12px",
    padding: "11px 12px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(248,250,252,0.95)",
    fontSize: "13px",
    outline: "none",
    color: "#0f172a",
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
    padding: "13px",
    borderRadius: "16px",
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  },
  repoChoiceActive: {
    borderColor: "rgba(124,58,237,0.45)",
    background: "linear-gradient(180deg, rgba(245,243,255,0.96), rgba(255,255,255,0.96))",
    boxShadow: "0 12px 24px rgba(124,58,237,0.08)",
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
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "2px",
  },
  repoChoiceOwner: {
    fontSize: "11px",
    color: "#64748b",
    marginBottom: "6px",
  },
  repoChoiceDesc: {
    fontSize: "12px",
    color: "#475569",
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
    padding: "3px 8px",
    borderRadius: "999px",
    background: "rgba(241,245,249,0.95)",
    color: "#64748b",
  },
  radio: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    border: "1.5px solid #cbd5e1",
    background: "#fff",
    flexShrink: 0,
  },
  radioActive: {
    border: "5px solid #7c3aed",
  },
  emptyHint: {
    padding: "16px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px",
  },
  preview: {
    margin: "0 18px 12px",
    padding: "13px 14px",
    borderRadius: "16px",
    border: "1px solid rgba(124,58,237,0.14)",
    background:
      "linear-gradient(180deg, rgba(250,245,255,0.95), rgba(255,255,255,0.95))",
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
    fontWeight: 700,
    color: "#0f172a",
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
    padding: "16px 18px 18px",
    borderTop: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(248,250,252,0.8)",
  },
  cancelBtn: {
    padding: "9px 16px",
    fontSize: "13px",
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "999px",
    cursor: "pointer",
    color: "#475569",
  },
  compareBtn: {
    padding: "9px 18px",
    fontSize: "13px",
    fontWeight: 600,
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    boxShadow: "0 10px 20px rgba(15,23,42,0.12)",
  },
};
