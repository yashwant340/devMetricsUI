import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useConnectedRepos,
  useDisconnectRepo,
  useSyncRepo,
} from "../hooks/useRepositories";
import type { Repo } from "../types/repo";
import ConnectRepoModal from "../components/ConnectRepoModel";
import CompareReposModal from "../components/CompareReposModal";
import { useLatestMetrics, useMetricsHistory } from "../hooks/useMetrics";
import type { MetricsSnapshot } from "../types/metrics";

export default function Dashboard() {
  const navigate = useNavigate();
  const { repos, loading, refetch }   = useConnectedRepos();
  const [user, setUser] = useState<{ login: string; avatar: string; email: string } | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [compareRepoId, setCompareRepoId] = useState<string | null>(null);
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [showComparisonTable, setShowComparisonTable] = useState(true);

  // Until the user chooses a repository, show the first connected one.
  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) ?? repos[0];
  const compareRepo = repos.find((repo) => repo.id === compareRepoId) ?? null;
  const effectiveCompareRepo = compareRepo?.id !== selectedRepo?.id ? compareRepo : null;
  const {
    snapshot: selectedSnapshot,
    loading: metricsLoading,
    refetch: refetchMetrics,
  } = useLatestMetrics(selectedRepo?.id ?? null);
  const {
    history: selectedHistory,
    loading: historyLoading,
    refetch: refetchHistory,
  } = useMetricsHistory(selectedRepo?.id ?? null);
  const {
    snapshot: compareSnapshot,
    loading: compareMetricsLoading,
    refetch: refetchCompareMetrics,
  } = useLatestMetrics(effectiveCompareRepo?.id ?? null);
  const handleSyncComplete = useCallback(() => {
    refetch();
    refetchMetrics();
    refetchHistory();
    refetchCompareMetrics();
  }, [refetch, refetchCompareMetrics, refetchHistory, refetchMetrics]);
  const { disconnect, loading: disconnecting, error: disconnectError } = useDisconnectRepo(refetch);
  const { sync, syncing } = useSyncRepo(handleSyncComplete);

  const handleLogout = async () => {
    await fetch("http://localhost:8080/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/auth/me", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setUser({
          login: data.login ?? "Profile",
          avatar: data.avatar ?? "",
          email: data.email ?? "",
        });
      } catch {
        // ignore and fall back to generic profile icon
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const anySyncing = syncing.size > 0;

  const metricCards = [
    {
      label: "Connected repos",
      value: repos.length,
    },
    {
      label: "Avg merge time",
      value: selectedSnapshot?.avgPrMergeHours != null
          ? `${selectedSnapshot.avgPrMergeHours}h`
          : "—",
      color: "#7c3aed",
      trend: buildTrendText(
          selectedHistory,
          (item) => item.avgPrMergeHours,
          "h",
      ),
      trendTone: buildTrendTone(
          selectedHistory,
          (item) => item.avgPrMergeHours,
          true,
      ),
      sparkline: buildSparklineSeries(selectedHistory, (item) => item.avgPrMergeHours),
      sparklineColor: "#7c3aed",
      sparklineReverse: true,
    },
    {
      label: "Open PRs",
      value: selectedSnapshot?.openPrCount ?? "—",
      color: "#0369a1",
      trend: buildTrendText(
          selectedHistory,
          (item) => item.openPrCount,
          "prs",
      ),
      trendTone: buildTrendTone(
          selectedHistory,
          (item) => item.openPrCount,
          false,
      ),
      sparkline: buildSparklineSeries(selectedHistory, (item) => item.openPrCount),
      sparklineColor: "#0f766e",
    },
    {
      label: "Health score",
      value: selectedSnapshot?.healthScore != null
          ? selectedSnapshot.healthScore
          : "—",
      color: selectedSnapshot?.healthScore != null
          ? healthScoreColor(selectedSnapshot.healthScore)
          : "#1a1a1a",
      trend: buildTrendText(
          selectedHistory,
          (item) => item.healthScore,
          "pts",
      ),
      trendTone: buildTrendTone(
          selectedHistory,
          (item) => item.healthScore,
          false,
      ),
      sparkline: buildSparklineSeries(selectedHistory, (item) => item.healthScore),
      sparklineColor: "#16a34a",
    },
  ];

  const additionalMetricCards = [
    {
      label: "Time to first review",
      value: formatHours(selectedSnapshot?.avgTimeToFirstReviewHours),
    },
    { label: "Merged PRs", value: selectedSnapshot?.mergedPrCount ?? "—" },
    { label: "Closed PRs", value: selectedSnapshot?.closedPrCount ?? "—" },
    { label: "Lines added", value: selectedSnapshot?.totalLinesAdded ?? "—" },
    { label: "Lines deleted", value: selectedSnapshot?.totalLinesDeleted ?? "—" },
    { label: "Total commits", value: selectedSnapshot?.totalCommits ?? "—" },
    {
      label: "Churn ratio",
      value: formatRatio(selectedSnapshot?.churnRatio),
    },
    {
      label: "Active contributors",
      value: selectedSnapshot?.activeContributors ?? "—",
    },
    {
      label: "PRs per contributor / week",
      value: formatNumber(selectedSnapshot?.avgPrsPerContributorPerWeek),
    },
    {
      label: "Commits per contributor / week",
      value: formatNumber(selectedSnapshot?.avgCommitsPerContributorPerWeek),
    },
  ];
  const insightCards = buildInsights(selectedHistory, selectedSnapshot);
  const comparisonRows = effectiveCompareRepo ? [
    {
      label: "Avg merge time",
      primary: formatHours(selectedSnapshot?.avgPrMergeHours),
      compare: formatHours(compareSnapshot?.avgPrMergeHours),
      delta: formatDelta(selectedSnapshot?.avgPrMergeHours, compareSnapshot?.avgPrMergeHours),
      deltaValue: numericDelta(selectedSnapshot?.avgPrMergeHours, compareSnapshot?.avgPrMergeHours),
      betterWhenLower: true,
    },
    {
      label: "Time to first review",
      primary: formatHours(selectedSnapshot?.avgTimeToFirstReviewHours),
      compare: formatHours(compareSnapshot?.avgTimeToFirstReviewHours),
      delta: formatDelta(selectedSnapshot?.avgTimeToFirstReviewHours, compareSnapshot?.avgTimeToFirstReviewHours),
      deltaValue: numericDelta(selectedSnapshot?.avgTimeToFirstReviewHours, compareSnapshot?.avgTimeToFirstReviewHours),
      betterWhenLower: true,
    },
    {
      label: "Open PRs",
      primary: formatCount(selectedSnapshot?.openPrCount),
      compare: formatCount(compareSnapshot?.openPrCount),
      delta: formatDelta(selectedSnapshot?.openPrCount, compareSnapshot?.openPrCount),
      deltaValue: numericDelta(selectedSnapshot?.openPrCount, compareSnapshot?.openPrCount),
      betterWhenLower: true,
    },
    {
      label: "Merged PRs",
      primary: formatCount(selectedSnapshot?.mergedPrCount),
      compare: formatCount(compareSnapshot?.mergedPrCount),
      delta: formatDelta(selectedSnapshot?.mergedPrCount, compareSnapshot?.mergedPrCount),
      deltaValue: numericDelta(selectedSnapshot?.mergedPrCount, compareSnapshot?.mergedPrCount),
      betterWhenLower: false,
    },
    {
      label: "Closed PRs",
      primary: formatCount(selectedSnapshot?.closedPrCount),
      compare: formatCount(compareSnapshot?.closedPrCount),
      delta: formatDelta(selectedSnapshot?.closedPrCount, compareSnapshot?.closedPrCount),
      deltaValue: numericDelta(selectedSnapshot?.closedPrCount, compareSnapshot?.closedPrCount),
      betterWhenLower: false,
    },
    {
      label: "Churn ratio",
      primary: formatRatio(selectedSnapshot?.churnRatio),
      compare: formatRatio(compareSnapshot?.churnRatio),
      delta: formatDelta(selectedSnapshot?.churnRatio, compareSnapshot?.churnRatio),
      deltaValue: numericDelta(selectedSnapshot?.churnRatio, compareSnapshot?.churnRatio),
      betterWhenLower: true,
    },
    {
      label: "Active contributors",
      primary: formatCount(selectedSnapshot?.activeContributors),
      compare: formatCount(compareSnapshot?.activeContributors),
      delta: formatDelta(selectedSnapshot?.activeContributors, compareSnapshot?.activeContributors),
      deltaValue: numericDelta(selectedSnapshot?.activeContributors, compareSnapshot?.activeContributors),
      betterWhenLower: false,
    },
    {
      label: "PRs / contributor / week",
      primary: formatNumber(selectedSnapshot?.avgPrsPerContributorPerWeek),
      compare: formatNumber(compareSnapshot?.avgPrsPerContributorPerWeek),
      delta: formatDelta(selectedSnapshot?.avgPrsPerContributorPerWeek, compareSnapshot?.avgPrsPerContributorPerWeek),
      deltaValue: numericDelta(selectedSnapshot?.avgPrsPerContributorPerWeek, compareSnapshot?.avgPrsPerContributorPerWeek),
      betterWhenLower: false,
    },
    {
      label: "Commits / contributor / week",
      primary: formatNumber(selectedSnapshot?.avgCommitsPerContributorPerWeek),
      compare: formatNumber(compareSnapshot?.avgCommitsPerContributorPerWeek),
      delta: formatDelta(selectedSnapshot?.avgCommitsPerContributorPerWeek, compareSnapshot?.avgCommitsPerContributorPerWeek),
      deltaValue: numericDelta(selectedSnapshot?.avgCommitsPerContributorPerWeek, compareSnapshot?.avgCommitsPerContributorPerWeek),
      betterWhenLower: false,
    },
    {
      label: "Health score",
      primary: selectedSnapshot?.healthScore != null ? String(selectedSnapshot.healthScore) : "—",
      compare: compareSnapshot?.healthScore != null ? String(compareSnapshot.healthScore) : "—",
      delta: formatDelta(selectedSnapshot?.healthScore, compareSnapshot?.healthScore),
      deltaValue: numericDelta(selectedSnapshot?.healthScore, compareSnapshot?.healthScore),
      betterWhenLower: false,
    },
  ] : [];
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
          <div style={styles.profileWrap} ref={profileMenuRef}>
            <button
              type="button"
              style={styles.profileBtn}
              onClick={() => setShowProfileMenu((current) => !current)}
              aria-label="Open profile menu"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.login} style={styles.profileAvatar} />
              ) : (
                <div style={styles.profileFallback}>
                  {user?.login?.[0]?.toUpperCase() ?? "P"}
                </div>
              )}
            </button>

            {showProfileMenu && (
              <div style={styles.profileMenu}>
                <div style={styles.profileMenuHeader}>
                  <div style={styles.profileMenuTitle}>Profile</div>
                  <div style={styles.profileMenuSubtext}>Signed in with GitHub</div>
                </div>
                <div style={styles.profileMenuInfo}>
                  <div style={styles.profileMenuName}>{user?.login ?? "Your account"}</div>
                  {user?.email && <div style={styles.profileMenuEmail}>{user.email}</div>}
                </div>
                <button
                  type="button"
                  style={styles.profileMenuLogout}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.metricsSection}>
          <div style={styles.metricsHeader}>
            <div>
              <div style={styles.metricsEyebrow}>Repository metrics</div>
              <div
                key={selectedRepo?.id ?? "none"}
                style={styles.metricsTitleAnimated}
              >
                {selectedRepo ? selectedRepo.name : "Select a repository"}
              </div>
              {effectiveCompareRepo && (
                <div style={styles.metricsSubtitle}>
                  Comparing with <span style={styles.compareRepoName}>{effectiveCompareRepo.name}</span>
                </div>
              )}
            </div>
            <div style={styles.headerPills}>
              {selectedRepo && (
                <span style={styles.selectedBadge}>Primary</span>
              )}
              <button
                style={{
                  ...styles.compareTriggerBtn,
                  opacity: repos.length < 2 ? 0.5 : 1,
                  cursor: repos.length < 2 ? "not-allowed" : "pointer",
                }}
                disabled={repos.length < 2}
                onClick={() => setShowCompareModal(true)}
              >
                {effectiveCompareRepo ? "Change compare" : "Compare repos"}
              </button>
            </div>
          </div>
          <div
            key={selectedRepo?.id ?? "none"}
            style={styles.metricsPanelMotion}
          >
            <div style={styles.metricsGrid}>
              {metricCards.map((m) => (
                <MetricCard
                  key={m.label}
                  metric={m}
                  loading={metricsLoading}
                  trendLoading={historyLoading}
                />
              ))}
            </div>
            {showAllMetrics && (
              <div style={styles.additionalMetricsGrid}>
                {additionalMetricCards.map((m) => (
                  <MetricCard key={m.label} metric={m} loading={metricsLoading} compact />
                ))}
              </div>
            )}
          </div>
          <div style={styles.moreMetricsControl}>
            <button
              style={styles.moreMetricsBtn}
              onClick={() => setShowAllMetrics((visible) => !visible)}
              aria-expanded={showAllMetrics}
            >
              {showAllMetrics ? "Hide additional metrics" : "Show all metrics"}
            </button>
          </div>
          {insightCards.length > 0 && (
            <div style={styles.insightSection}>
              <div style={styles.insightSectionHeader}>
                <div>
                  <div style={styles.insightSectionEyebrow}>Trend insights</div>
                  <div style={styles.insightSectionTitle}>What the last few snapshots suggest</div>
                </div>
              </div>
              <div style={styles.insightGrid}>
                {insightCards.map((insight) => (
                  <InsightCard key={insight.title} insight={insight} />
                ))}
              </div>
            </div>
          )}
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

          {disconnectError && (
            <div style={styles.panelError}>
              {disconnectError}
            </div>
          )}

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
                  isSelected={selectedRepo?.id === repo.id}
                  isDisconnecting={disconnecting}
                  onSelect={() => {
                    setSelectedRepoId(repo.id);
                  }}
                  onSync={() => sync(repo.id)}
                  onDisconnect={() => disconnect(repo.id)}
                />
              ))}
            </div>
          )}
        </div>
                  {effectiveCompareRepo && (
            <div style={styles.comparisonPanel}>
              <div style={styles.comparisonHeader}>
                <button
                  type="button"
                  style={styles.comparisonSummaryBtn}
                  onClick={() => setShowComparisonTable((visible) => !visible)}
                  aria-expanded={showComparisonTable}
                >
                  <div style={styles.comparisonSummaryLeft}>
                    <div style={styles.comparisonEyebrow}>Repository comparison</div>
                    <div style={styles.comparisonTitle}>
                      {selectedRepo?.name} vs {effectiveCompareRepo.name}
                    </div>
                  </div>
                  <div style={styles.comparisonSummaryMeta}>
                    <span style={styles.comparisonMetricCount}>
                      {comparisonRows.length} metrics
                    </span>
                    <span style={styles.comparisonChevron}>
                      {showComparisonTable ? "▾" : "▸"}
                    </span>
                  </div>
                </button>
                <div style={styles.comparisonActions}>
                  <button
                    style={styles.swapBtn}
                    onClick={() => setShowCompareModal(true)}
                  >
                    Change comparison
                  </button>
                </div>
              </div>

              {showComparisonTable ? (
                <div style={styles.comparisonTable}>
                  <div style={styles.comparisonTableHead}>
                    <span>Metric</span>
                    <span>{selectedRepo?.name}</span>
                    <span>{effectiveCompareRepo.name}</span>
                    <span>Delta</span>
                  </div>
                  {comparisonRows.map((row) => (
                    <ComparisonRow
                      key={row.label}
                      row={row}
                      loading={metricsLoading || compareMetricsLoading}
                    />
                  ))}
                </div>
              ) : (
                <div style={styles.comparisonCollapsed}>
                  <div style={styles.comparisonCollapsedText}>
                    {selectedRepo?.name} is currently compared with {effectiveCompareRepo.name}.
                  </div>
                  <div style={styles.comparisonCollapsedSubtext}>
                    Expand the dropdown to see metric-by-metric differences.
                  </div>
                </div>
              )}
            </div>
          )}
      </main>

      {showModal && (
        <ConnectRepoModal
          onClose={() => setShowModal(false)}
          onConnected={refetch}
        />
      )}

        {showCompareModal && (
        <CompareReposModal
          repos={repos}
          selectedPrimaryId={selectedRepo?.id ?? null}
          selectedCompareId={compareRepoId}
          onClose={() => setShowCompareModal(false)}
          onApply={(primaryId, compareId) => {
            setSelectedRepoId(primaryId);
            setCompareRepoId(compareId);
            setShowComparisonTable(true);
            setShowCompareModal(false);
          }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function MetricCard({
  metric,
  loading,
  trendLoading = false,
  compact = false,
}: {
  metric: {
    label: string;
    value: string | number;
    color?: string;
    trend?: string;
    trendTone?: "good" | "bad" | "neutral";
    sparkline?: number[];
    sparklineColor?: string;
    sparklineReverse?: boolean;
  };
  loading: boolean;
  trendLoading?: boolean;
  compact?: boolean;
}) {
  return (
    <div style={{ ...styles.metricCard, ...(compact ? styles.compactMetricCard : {}) }}>
      <div style={styles.metricLabel}>{metric.label}</div>
      <div style={styles.metricValueShell}>
        <div
          style={{
            ...styles.metricValue,
            color: metric.color ?? "#1a1a1a",
            opacity: loading ? 0 : 1,
          }}
        >
          {metric.value}
        </div>
        <div
          aria-hidden="true"
          style={{
            ...styles.metricSkeleton,
            opacity: loading ? 1 : 0,
          }}
        >
          <div
            style={{
              ...styles.metricSkeletonLine,
              ...(compact ? styles.metricSkeletonLineCompact : {}),
            }}
          />
        </div>
      </div>
      {(metric.trend || metric.sparkline) && (
        <div style={styles.metricCardFooter}>
          {metric.trend && (
            <div
              style={{
                ...styles.metricTrend,
                ...(metric.trendTone === "good" ? styles.metricTrendGood : {}),
                ...(metric.trendTone === "bad" ? styles.metricTrendBad : {}),
              }}
            >
              {trendLoading ? "Loading trend…" : metric.trend}
            </div>
          )}
          {metric.sparkline && metric.sparkline.length > 1 && (
            trendLoading ? (
              <div style={styles.metricSparklineSkeleton} />
            ) : (
              <Sparkline
                values={metric.sparkline}
                color={metric.sparklineColor ?? "#94a3b8"}
                reverse={metric.sparklineReverse}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
}: {
  insight: {
    title: string;
    body: string;
    tone: "good" | "bad" | "neutral";
  };
}) {
  return (
    <div
      style={{
        ...styles.insightCard,
        ...(insight.tone === "good" ? styles.insightCardGood : {}),
        ...(insight.tone === "bad" ? styles.insightCardBad : {}),
      }}
    >
      <div style={styles.insightTitle}>{insight.title}</div>
      <div style={styles.insightBody}>{insight.body}</div>
    </div>
  );
}

function Sparkline({
  values,
  color,
  reverse = false,
}: {
  values: number[];
  color: string;
  reverse?: boolean;
}) {
  const points = reverse ? [...values].reverse() : values;
  const width = 120;
  const height = 28;
  const padding = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="28"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={styles.sparkline}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}

function ComparisonRow({
  row,
  loading,
}: {
  row: {
    label: string;
    primary: string;
    compare: string;
    delta: string;
    deltaValue: number | null;
    betterWhenLower: boolean;
  };
  loading: boolean;
}) {
  const tone = deltaTone(row.deltaValue, row.betterWhenLower);

  return (
    <div style={styles.comparisonRow}>
      <div style={styles.comparisonMetricName}>{row.label}</div>
      <ValueCell value={row.primary} loading={loading} />
      <ValueCell value={row.compare} loading={loading} />
      <div
        style={{
          ...styles.comparisonDelta,
          ...(tone === "good" ? styles.comparisonDeltaGood : {}),
          ...(tone === "bad" ? styles.comparisonDeltaBad : {}),
        }}
      >
        {loading ? "Loading…" : row.delta}
      </div>
    </div>
  );
}

function ValueCell({
  value,
  loading,
}: {
  value: string;
  loading: boolean;
}) {
  return (
    <div style={styles.comparisonValueShell}>
      <div style={{ ...styles.comparisonValue, opacity: loading ? 0 : 1 }}>
        {value}
      </div>
      <div
        aria-hidden="true"
        style={{
          ...styles.comparisonValueSkeleton,
          opacity: loading ? 1 : 0,
        }}
      >
        <div style={styles.comparisonValueSkeletonLine} />
      </div>
    </div>
  );
}

// ── RepoRow ────────────────────────────────────────────────────────────────

function RepoRow({
  repo,
  isSyncing,
  isSelected,
  isDisconnecting,
  onSelect,
  onSync,
  onDisconnect,
}: {
  repo: Repo;
  isSyncing: boolean;
  isSelected: boolean;
  isDisconnecting: boolean;
  onSelect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{
      ...styles.repoRow,
      ...(isSelected ? styles.repoRowSelected : {}),
      background: isSyncing ? "#fffbeb" : isSelected ? "#f0f7ff" : "transparent",
      transition: "background 0.3s",
    }} onClick={onSelect} role="button" tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}>

      {/* Left — repo info */}
      <div style={styles.repoInfo}>
        <div style={styles.repoName}>
          {repo.isPrivate && (
            <span style={styles.privateBadge}>Private</span>
          )}
          <span>{repo.name}</span>
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
          onClick={(event) => { event.stopPropagation(); onSync(); }}
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
                disabled={isDisconnecting}
                onClick={(event) => {
                  event.stopPropagation();
                  onDisconnect();
                  setConfirming(false);
                }}
              >
              {isDisconnecting ? "Disconnecting..." : "Confirm"}
              </button>
            <button
              style={styles.cancelBtn}
              disabled={isDisconnecting}
              onClick={(event) => { event.stopPropagation(); setConfirming(false); }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            style={styles.disconnectBtn}
            onClick={(event) => { event.stopPropagation(); setConfirming(true); }}
            disabled={isSyncing || isDisconnecting}
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

function formatHours(hours: number | null | undefined): string {
  return hours == null ? "—" : `${hours}h`;
}

function formatRatio(ratio: number | null | undefined): string {
  return ratio == null ? "—" : `${ratio.toFixed(2)}×`;
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : value.toFixed(1);
}

function formatCount(value: number | null | undefined): string {
  return value == null ? "—" : String(value);
}

function numericDelta(
  primary: number | null | undefined,
  compare: number | null | undefined,
): number | null {
  if (primary == null || compare == null) return null;
  return primary - compare;
}

function formatDelta(
  primary: number | null | undefined,
  compare: number | null | undefined,
): string {
  const delta = numericDelta(primary, compare);
  if (delta == null) return "—";
  const absolute = Math.abs(delta);
  if (absolute === 0) return "0";
  const precision = Number.isInteger(absolute) ? 0 : 2;
  const formatted = absolute.toFixed(precision);
  return `${delta > 0 ? "+" : "−"}${formatted}`;
}

function deltaTone(
  delta: number | null,
  betterWhenLower: boolean,
): "good" | "bad" | "neutral" {
  if (delta == null || delta === 0) return "neutral";
  const primaryBetter = betterWhenLower ? delta < 0 : delta > 0;
  return primaryBetter ? "good" : "bad";
}

function sortHistory(history: MetricsSnapshot[]): MetricsSnapshot[] {
  return [...history].sort(
    (a, b) =>
      new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime(),
  );
}

function buildSparklineSeries(
  history: MetricsSnapshot[],
  accessor: (snapshot: MetricsSnapshot) => number | null | undefined,
): number[] {
  return sortHistory(history)
    .map((snapshot) => accessor(snapshot))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function getTrendDelta(
  history: MetricsSnapshot[],
  accessor: (snapshot: MetricsSnapshot) => number | null | undefined,
): number | null {
  const series = buildSparklineSeries(history, accessor);
  if (series.length < 2) return null;
  return series[series.length - 1] - series[series.length - 2];
}

function formatTrendDelta(
  delta: number | null,
  unit: string,
): string {
  if (delta == null) return "No history yet";
  if (delta === 0) return "Flat vs prev";
  const absolute = Math.abs(delta);
  const precision = Number.isInteger(absolute) ? 0 : 1;
  const formatted = absolute.toFixed(precision);
  return `${delta > 0 ? "▲" : "▼"} ${formatted}${unit} vs prev`;
}

function buildTrendText(
  history: MetricsSnapshot[],
  accessor: (snapshot: MetricsSnapshot) => number | null | undefined,
  unit: string,
): string {
  return formatTrendDelta(getTrendDelta(history, accessor), unit);
}

function buildTrendTone(
  history: MetricsSnapshot[],
  accessor: (snapshot: MetricsSnapshot) => number | null | undefined,
  betterWhenLower: boolean,
): "good" | "bad" | "neutral" {
  return deltaTone(getTrendDelta(history, accessor), betterWhenLower);
}

function buildInsights(
  history: MetricsSnapshot[],
  latest: MetricsSnapshot | null,
): Array<{ title: string; body: string; tone: "good" | "bad" | "neutral" }> {
  const sorted = sortHistory(history);
  const recent = sorted.slice(-5);
  const prev = recent[recent.length - 2] ?? null;
  const current = recent[recent.length - 1] ?? latest;
  if (!current) return [];

  const insights: Array<{ title: string; body: string; tone: "good" | "bad" | "neutral" }> = [];

  const addInsight = (
    title: string,
    body: string,
    tone: "good" | "bad" | "neutral",
  ) => {
    if (insights.length < 3) insights.push({ title, body, tone });
  };

  if (current.avgPrMergeHours != null && prev?.avgPrMergeHours != null) {
    const delta = current.avgPrMergeHours - prev.avgPrMergeHours;
    if (Math.abs(delta) >= 0.25) {
      addInsight(
        delta < 0 ? "Merge flow is improving" : "Merge flow is slowing down",
        `Average merge time moved ${formatTrendDelta(delta, "h")} in the last snapshot.`,
        delta < 0 ? "good" : "bad",
      );
    }
  }

  if (current.healthScore != null && prev?.healthScore != null) {
    const delta = current.healthScore - prev.healthScore;
    if (Math.abs(delta) >= 3) {
      addInsight(
        delta > 0 ? "Repository health is trending up" : "Repository health is slipping",
        `Health score changed ${formatTrendDelta(delta, "pts")} versus the previous snapshot.`,
        delta > 0 ? "good" : "bad",
      );
    }
  }

  if (current.activeContributors != null && prev?.activeContributors != null) {
    const delta = current.activeContributors - prev.activeContributors;
    if (Math.abs(delta) >= 1) {
      addInsight(
        delta > 0 ? "More people are contributing" : "Contributor count dipped",
        `${Math.abs(delta)} contributor${Math.abs(delta) === 1 ? "" : "s"} ${delta > 0 ? "joined the flow" : "went quiet"} since the previous snapshot.`,
        delta > 0 ? "good" : "bad",
      );
    }
  }

  if (current.openPrCount >= 15) {
    addInsight(
      "PR backlog deserves attention",
      `There are currently ${current.openPrCount} open PRs, so review flow may be lagging behind incoming work.`,
      "bad",
    );
  }

  if (insights.length < 3 && recent.length >= 2) {
    const lastHealth = current.healthScore;
    const lastMerge = current.avgPrMergeHours;
    addInsight(
      "Snapshot is being tracked",
      `Latest numbers show ${formatCount(current.activeContributors)} active contributors${lastHealth != null ? ` and a health score of ${lastHealth}` : ""}${lastMerge != null ? ` with merge time at ${formatHours(lastMerge)}` : ""}.`,
      "neutral",
    );
  }

  return insights;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(224, 231, 255, 0.65), transparent 28%), radial-gradient(circle at top right, rgba(236, 253, 245, 0.8), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #f3f4f6 56%, #eef2f7 100%)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#0f172a",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem",
    height: "64px",
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px)",
    borderBottom: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "0 8px 30px rgba(15,23,42,0.04)",
  },
  navLeft: { display: "flex", alignItems: "center", gap: "10px" },
  navBrand: { fontSize: "15px", fontWeight: 650, color: "#0f172a", letterSpacing: "-0.01em" },
  navRight: { display: "flex", alignItems: "center", gap: "12px" },
  navSyncBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#92400e",
    background: "rgba(255,251,235,0.92)",
    border: "1px solid rgba(245,158,11,0.22)",
    borderRadius: "999px",
    padding: "5px 10px",
    animation: "pulse 2s ease-in-out infinite",
  },
  profileWrap: {
    position: "relative",
  },
  profileBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 6px 6px 6px",
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(148,163,184,0.28)",
    borderRadius: "999px",
    cursor: "pointer",
    color: "#475569",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
    minHeight: "40px",
  },
  profileAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    objectFit: "cover",
    display: "block",
  },
  profileFallback: {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
  },
  profileChevron: {
    fontSize: "11px",
    color: "#64748b",
    lineHeight: 1,
    marginLeft: "2px",
  },
  profileLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#334155",
  },
  profileMenu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 12px)",
    minWidth: "240px",
    background: "rgba(255,255,255,0.98)",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: "18px",
    boxShadow: "0 28px 80px rgba(15,23,42,0.18)",
    backdropFilter: "blur(18px)",
    padding: "0.9rem",
    zIndex: 60,
  },
  profileMenuHeader: {
    paddingBottom: "0.75rem",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
    marginBottom: "0.75rem",
  },
  profileMenuTitle: {
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#64748b",
    marginBottom: "6px",
  },
  profileMenuSubtext: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  profileMenuInfo: {
    marginBottom: "0.75rem",
  },
  profileMenuName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "3px",
    wordBreak: "break-word",
  },
  profileMenuEmail: {
    fontSize: "12px",
    color: "#64748b",
    wordBreak: "break-word",
  },
  profileMenuLogout: {
    width: "100%",
    fontSize: "13px",
    padding: "9px 12px",
    background: "rgba(254,242,242,0.95)",
    border: "1px solid rgba(248,113,113,0.22)",
    borderRadius: "12px",
    cursor: "pointer",
    color: "#b91c1c",
    textAlign: "left",
  },
  main: {
    width: "100%",
    maxWidth: "none",
    margin: 0,
    padding: "1.5rem clamp(1rem, 2vw, 2rem) 2.5rem",
  },
  metricsSection: {
    marginBottom: "1.5rem",
    padding: "1.25rem clamp(1rem, 1.5vw, 1.25rem)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.72)",
    boxShadow: "0 20px 60px rgba(15,23,42,0.06)",
    backdropFilter: "blur(14px)",
  },
  metricsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px",
    gap: "16px",
  },
  metricsEyebrow: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#64748b",
    marginBottom: "4px",
  },
  metricsTitle: { fontSize: "18px", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" },
  metricsTitleAnimated: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.02em",
    animation: "fadeInUp 180ms ease-out",
  },
  metricsSubtitle: {
    marginTop: "5px",
    fontSize: "13px",
    color: "#64748b",
  },
  compareRepoName: {
    color: "#0f766e",
    fontWeight: 600,
  },
  selectedBadge: {
    fontSize: "11px",
    padding: "4px 10px",
    background: "rgba(14,165,233,0.1)",
    color: "#0369a1",
    borderRadius: "999px",
  },
  compareBadge: {
    fontSize: "11px",
    padding: "4px 10px",
    background: "rgba(168,85,247,0.1)",
    color: "#7e22ce",
    borderRadius: "999px",
  },
  clearCompareBtn: {
    fontSize: "11px",
    padding: "4px 10px",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "999px",
    color: "#64748b",
    cursor: "pointer",
  },
  compareHint: {
    fontSize: "12px",
    color: "#64748b",
  },
  headerPills: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  compareTriggerBtn: {
    fontSize: "12px",
    padding: "7px 12px",
    color: "#6d28d9",
    background: "rgba(245,243,255,0.9)",
    border: "1px solid rgba(196,181,253,0.5)",
    borderRadius: "999px",
    cursor: "pointer",
  },
  metricsPanelMotion: {
    display: "grid",
    gap: "14px",
    animation: "fadeInUp 180ms ease-out",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  moreMetricsControl: { display: "flex", justifyContent: "flex-end", marginTop: "10px" },
  moreMetricsBtn: {
    fontSize: "12px",
    padding: "7px 12px",
    color: "#0369a1",
    background: "rgba(240,249,255,0.9)",
    border: "1px solid rgba(125,211,252,0.5)",
    borderRadius: "999px",
    cursor: "pointer",
  },
  additionalMetricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginTop: "14px",
  },
  comparisonPanel: {
    marginTop: "18px",
    padding: "1rem 1.25rem 1.25rem",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "20px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.9) 100%)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.05)",
  },
  comparisonHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },
  comparisonSummaryBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    textAlign: "left",
    padding: "0",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    minWidth: 0,
  },
  comparisonSummaryLeft: {
    minWidth: 0,
  },
  comparisonSummaryMeta: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  comparisonMetricCount: {
    fontSize: "11px",
    padding: "4px 9px",
    borderRadius: "999px",
    background: "rgba(233,213,255,0.65)",
    color: "#6d28d9",
    whiteSpace: "nowrap",
  },
  comparisonChevron: {
    fontSize: "14px",
    color: "#6b7280",
  },
  comparisonEyebrow: {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#8b5cf6",
    marginBottom: "3px",
  },
  comparisonTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  },
  comparisonActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  swapBtn: {
    fontSize: "12px",
    padding: "7px 12px",
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: "999px",
    cursor: "pointer",
    color: "#475569",
  },
  comparisonTable: {
    display: "grid",
    gap: "8px",
  },
  comparisonCollapsed: {
    padding: "13px 14px",
    borderRadius: "14px",
    background: "rgba(248,250,252,0.95)",
    border: "1px solid rgba(148,163,184,0.12)",
    display: "grid",
    gap: "6px",
  },
  comparisonCollapsedText: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
  },
  comparisonCollapsedSubtext: {
    fontSize: "12px",
    color: "#6b7280",
  },
  comparisonTableHead: {
    display: "grid",
    gridTemplateColumns:
      "minmax(180px, 1.6fr) repeat(2, minmax(120px, 1fr)) minmax(80px, 0.8fr)",
    gap: "10px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#94a3b8",
    padding: "0 4px",
  },
  comparisonRow: {
    display: "grid",
    gridTemplateColumns:
      "minmax(180px, 1.6fr) repeat(2, minmax(120px, 1fr)) minmax(80px, 0.8fr)",
    gap: "10px",
    alignItems: "center",
    padding: "10px 4px",
    borderTop: "1px solid rgba(148,163,184,0.12)",
  },
  comparisonMetricName: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#1e293b",
  },
  comparisonValueShell: {
    position: "relative",
    minHeight: "24px",
  },
  comparisonValue: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#0f172a",
    transition: "opacity 180ms ease",
  },
  comparisonValueSkeleton: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    transition: "opacity 180ms ease",
    pointerEvents: "none",
  },
  comparisonValueSkeletonLine: {
    width: "72%",
    height: "14px",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #ece9e4 0%, #f7f4ef 50%, #ece9e4 100%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.2s ease-in-out infinite",
  },
  comparisonDelta: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
    justifySelf: "end",
  },
  comparisonDeltaGood: {
    color: "#16a34a",
  },
  comparisonDeltaBad: {
    color: "#dc2626",
  },
  insightSection: {
    marginTop: "18px",
    padding: "1rem 1.25rem 1.25rem",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.72)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.04)",
  },
  insightSectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  insightSectionEyebrow: {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#0f766e",
    marginBottom: "3px",
  },
  insightSectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  insightCard: {
    borderRadius: "16px",
    padding: "14px",
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(148,163,184,0.14)",
  },
  insightCardGood: {
    background: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  insightCardBad: {
    background: "#fef2f2",
    borderColor: "#fecaca",
  },
  insightTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "6px",
  },
  insightBody: {
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#475569",
  },
  metricCard: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.92) 100%)",
    border: "1px solid rgba(148,163,184,0.14)",
    borderRadius: "18px",
    padding: "1rem",
    boxShadow: "0 12px 30px rgba(15,23,42,0.04)",
  },
  compactMetricCard: { padding: "0.875rem" },
  metricLabel: { fontSize: "12px", color: "#64748b", marginBottom: "6px", fontWeight: 600 },
  metricCardFooter: {
    marginTop: "10px",
    display: "grid",
    gap: "8px",
  },
  metricTrend: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    letterSpacing: "0.01em",
  },
  metricTrendGood: {
    color: "#16a34a",
  },
  metricTrendBad: {
    color: "#dc2626",
  },
  metricSparklineSkeleton: {
    height: "28px",
    borderRadius: "8px",
    background: "linear-gradient(90deg, #ece9e4 0%, #f7f4ef 50%, #ece9e4 100%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.2s ease-in-out infinite",
  },
  sparkline: {
    display: "block",
  },
  metricValueShell: {
    position: "relative",
    minHeight: "40px",
  },
  metricValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#0f172a",
    transition: "opacity 180ms ease",
  },
  metricSkeleton: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    transition: "opacity 180ms ease",
    pointerEvents: "none",
  },
  metricSkeletonLine: {
    width: "68%",
    height: "22px",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #ece9e4 0%, #f7f4ef 50%, #ece9e4 100%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.2s ease-in-out infinite",
  },
  metricSkeletonLineCompact: {
    width: "52%",
    height: "16px",
  },
  panel: {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(148,163,184,0.16)",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
    width: "100%",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 1.25rem",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
    gap: "12px",
    flexWrap: "wrap",
  },
  panelError: {
    margin: "12px 1.25rem 0",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "13px",
  },
  panelHeaderLeft: { display: "flex", alignItems: "center", gap: "10px" },
  panelHeaderRight: { display: "flex", alignItems: "center", gap: "8px" },
  panelTitle: { fontSize: "14px", fontWeight: 700, color: "#0f172a" },
  panelSyncNote: { fontSize: "12px", color: "#b45309" },
  syncAllBtn: {
    fontSize: "12px",
    padding: "7px 12px",
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: "999px",
    color: "#475569",
  },
  connectBtn: {
    fontSize: "13px",
    padding: "8px 14px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(15,23,42,0.12)",
  },
  centered: {
    display: "flex", justifyContent: "center",
    alignItems: "center", padding: "3rem",
  },
  repoRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "14px 1.25rem",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
    cursor: "pointer",
    transition: "background 160ms ease, transform 160ms ease, box-shadow 160ms ease",
  },
  repoRowSelected: {
    boxShadow: "inset 3px 0 0 #0ea5e9",
    background: "linear-gradient(90deg, rgba(14,165,233,0.06), transparent 30%)",
  },
  repoInfo: { flex: 1 },
  repoName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
    display: "flex", alignItems: "center",
    gap: "6px", marginBottom: "3px", flexWrap: "wrap",
  },
  privateBadge: {
    fontSize: "10px", padding: "1px 6px",
    background: "rgba(241,245,249,0.95)", color: "#64748b", borderRadius: "999px",
  },
  syncingPill: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "11px", padding: "2px 8px",
    background: "rgba(255,251,235,0.95)", color: "#b45309",
    border: "1px solid rgba(245,158,11,0.22)", borderRadius: "999px",
  },
  repoDesc: {
    fontSize: "12px", color: "#64748b",
    marginBottom: "6px", lineHeight: "1.4",
  },
  repoMeta: { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" },
  metaChip: {
    fontSize: "11px", padding: "2px 8px",
    background: "rgba(241,245,249,0.95)", color: "#64748b", borderRadius: "999px",
  },
  syncingChip: {
    background: "rgba(255,251,235,0.95)", color: "#b45309",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  syncedChip: { background: "rgba(240,253,244,0.95)", color: "#16a34a" },
  neverSyncedChip: { background: "rgba(255,251,235,0.95)", color: "#d97706" },
  progressWrap: {
    height: "4px",
    background: "rgba(226,232,240,0.9)",
    borderRadius: "999px",
    overflow: "hidden",
    marginTop: "6px", width: "100%",
  },
  progressBar: {
    height: "100%", width: "40%",
    background: "linear-gradient(90deg, #f59e0b 0%, #fb923c 100%)",
    borderRadius: "999px",
    animation: "progress 1.5s ease-in-out infinite alternate",
  },
  actions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    paddingLeft: "12px",
    flexShrink: 0,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  syncBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    padding: "6px 12px",
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: "999px",
    color: "#475569",
  },
  compareBtn: {
    fontSize: "12px",
    padding: "6px 12px",
    background: "rgba(245,243,255,0.9)",
    border: "1px solid rgba(124,58,237,0.24)",
    borderRadius: "999px",
    cursor: "pointer",
    color: "#7c3aed",
  },
  compareBtnActive: {
    background: "rgba(233,213,255,0.8)",
    borderColor: "rgba(192,132,252,0.9)",
  },
  disconnectBtn: {
    fontSize: "12px",
    padding: "6px 12px",
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "999px",
    cursor: "pointer",
    color: "#94a3b8",
  },
  confirmBtn: {
    fontSize: "12px",
    padding: "6px 12px",
    background: "rgba(254,226,226,0.95)",
    color: "#b91c1c",
    border: "1px solid rgba(248,113,113,0.28)",
    borderRadius: "999px",
    cursor: "pointer",
  },
  cancelBtn: {
    fontSize: "12px",
    padding: "6px 12px",
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "999px",
    cursor: "pointer",
    color: "#64748b",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "3rem 1rem",
    gap: "12px",
  },
  emptyText: { fontSize: "13px", color: "#94a3b8", margin: 0, textAlign: "center" },
  emptyConnectBtn: {
    fontSize: "13px",
    padding: "9px 18px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(15,23,42,0.12)",
  },
};

function healthScoreColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}
