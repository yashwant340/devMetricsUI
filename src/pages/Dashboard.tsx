import { useCallback, useState } from "react";
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
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
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
  metricsSection: { marginBottom: "1.5rem" },
  metricsHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: "10px",
  },
  metricsEyebrow: {
    fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#888", marginBottom: "3px",
  },
  metricsTitle: { fontSize: "16px", fontWeight: 600, color: "#1a1a1a" },
  metricsTitleAnimated: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#1a1a1a",
    animation: "fadeInUp 180ms ease-out",
  },
  metricsSubtitle: {
    marginTop: "4px",
    fontSize: "12px",
    color: "#6b7280",
  },
  compareRepoName: {
    color: "#0369a1",
    fontWeight: 600,
  },
  selectedBadge: {
    fontSize: "11px", padding: "3px 9px", background: "#e0f2fe",
    color: "#0369a1", borderRadius: "20px",
  },
  compareBadge: {
    fontSize: "11px",
    padding: "3px 9px",
    background: "#f3e8ff",
    color: "#7e22ce",
    borderRadius: "20px",
  },
  clearCompareBtn: {
    fontSize: "11px",
    padding: "3px 9px",
    background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: "20px",
    color: "#6b7280",
    cursor: "pointer",
  },
  compareHint: {
    fontSize: "12px",
    color: "#9ca3af",
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
    padding: "6px 10px",
    color: "#7c3aed",
    background: "#f5f3ff",
    border: "0.5px solid #ddd6fe",
    borderRadius: "6px",
    cursor: "pointer",
  },
  metricsPanelMotion: {
    display: "grid",
    gap: "12px",
    animation: "fadeInUp 180ms ease-out",
  },
  metricsGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: "12px",
  },
  moreMetricsControl: { display: "flex", justifyContent: "flex-end", marginTop: "10px" },
  moreMetricsBtn: {
    fontSize: "12px", padding: "6px 10px", color: "#0369a1", background: "#f0f9ff",
    border: "0.5px solid #bae6fd", borderRadius: "6px", cursor: "pointer",
  },
  additionalMetricsGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px", marginTop: "12px",
  },
  comparisonPanel: {
    marginTop: "18px",
    padding: "1rem 1.25rem 1.25rem",
    borderTop: "0.5px solid rgba(0,0,0,0.06)",
    background: "linear-gradient(180deg, #fafafa 0%, #fff 100%)",
  },
  comparisonHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
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
    padding: "3px 8px",
    borderRadius: "999px",
    background: "#ede9fe",
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
    fontSize: "14px",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  comparisonActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  swapBtn: {
    fontSize: "12px",
    padding: "6px 10px",
    background: "#fff",
    border: "0.5px solid rgba(0,0,0,0.12)",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#555",
  },
  comparisonTable: {
    display: "grid",
    gap: "8px",
  },
  comparisonCollapsed: {
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fafafa",
    border: "0.5px solid rgba(0,0,0,0.06)",
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
    gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr",
    gap: "10px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#9ca3af",
    padding: "0 4px",
  },
  comparisonRow: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr",
    gap: "10px",
    alignItems: "center",
    padding: "10px 4px",
    borderTop: "0.5px solid rgba(0,0,0,0.06)",
  },
  comparisonMetricName: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#1f2937",
  },
  comparisonValueShell: {
    position: "relative",
    minHeight: "24px",
  },
  comparisonValue: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
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
    color: "#6b7280",
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
    borderTop: "0.5px solid rgba(0,0,0,0.06)",
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
    fontSize: "14px",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
  },
  insightCard: {
    borderRadius: "12px",
    padding: "14px",
    background: "#fff",
    border: "0.5px solid rgba(0,0,0,0.08)",
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
    color: "#111827",
    marginBottom: "6px",
  },
  insightBody: {
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#4b5563",
  },
  metricCard: {
    background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: "10px", padding: "1rem",
  },
  compactMetricCard: { padding: "0.875rem" },
  metricLabel: { fontSize: "12px", color: "#aaa", marginBottom: "6px" },
  metricCardFooter: {
    marginTop: "10px",
    display: "grid",
    gap: "8px",
  },
  metricTrend: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#6b7280",
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
    fontWeight: 500,
    color: "#1a1a1a",
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
    background: "#fff", border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: "12px", overflow: "hidden",
  },
  panelHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 1.25rem",
    borderBottom: "0.5px solid rgba(0,0,0,0.06)",
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
    cursor: "pointer",
  },
  repoRowSelected: { boxShadow: "inset 3px 0 0 #0284c7" },
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
  compareBtn: {
    fontSize: "12px",
    padding: "5px 12px",
    background: "transparent",
    border: "0.5px solid rgba(124,58,237,0.28)",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#7c3aed",
  },
  compareBtnActive: {
    background: "#f3e8ff",
    borderColor: "#c084fc",
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

function healthScoreColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}
