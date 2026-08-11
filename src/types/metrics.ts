export interface MetricsSnapshot {
  id: string;
  snapshotDate: string;

  // PR metrics
  avgPrMergeHours: number | null;
  avgTimeToFirstReviewHours: number | null;
  openPrCount: number;
  mergedPrCount: number;
  closedPrCount: number;

  // Churn
  totalLinesAdded: number;
  totalLinesDeleted: number;
  totalCommits: number;
  churnRatio: number | null;

  // Velocity
  activeContributors: number;
  avgPrsPerContributorPerWeek: number | null;
  avgCommitsPerContributorPerWeek: number | null;

  // Health
  healthScore: number;
}