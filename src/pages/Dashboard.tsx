import { useNavigate } from "react-router-dom";
import React, { type JSX } from "react";

interface User {
  login: string;
  avatar: string | null;
}

export default function Dashboard(): JSX.Element {
  const navigate = useNavigate();

  const token = sessionStorage.getItem("devmetrics_token");
  let user: User = { login: "—", avatar: null };

  try {
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      user = {
        login: payload.login ?? "—",
        avatar: payload.avatar ?? null,
      };
    }
  } catch (_) {
    // silently fail (can improve later)
  }

  const handleLogout = (): void => {
    sessionStorage.removeItem("devmetrics_token");
    navigate("/login", { replace: true });
  };

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="#1a1a1a" />
            <path
              d="M10 26 L18 10 L26 26"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M13 21 L23 21"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span style={styles.navBrand}>DevMetrics</span>
        </div>

        <div style={styles.navRight}>
          {user.avatar && (
            <img src={user.avatar} alt="avatar" style={styles.avatar} />
          )}
          <span style={styles.navLogin}>{user.login}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={styles.main}>
        <div style={styles.successBanner}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#16a34a" strokeWidth="1.5" />
            <path
              d="M5 8l2 2 4-4"
              stroke="#16a34a"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          GitHub OAuth flow complete — you are authenticated as
          <strong style={{ marginLeft: 4 }}>{user.login}</strong>
        </div>

        <div style={styles.metricsGrid}>
          {[
            { label: "Connected repos", value: "—" },
            { label: "Avg merge time", value: "—" },
            { label: "Open PRs", value: "—" },
            { label: "Health score", value: "—" },
          ].map((m) => (
            <div key={m.label} style={styles.metricCard}>
              <div style={styles.metricLabel}>{m.label}</div>
              <div style={styles.metricValue}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Repositories</span>
            <span style={styles.panelBadge}>Coming in week 3</span>
          </div>

          <div style={styles.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <p style={styles.emptyText}>
              Connect your first GitHub repo to start seeing metrics
            </p>
            <button style={styles.connectBtn} disabled>
              Connect a repository
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f9f9f7",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem",
    height: "56px",
    background: "#ffffff",
    borderBottom: "0.5px solid rgba(0,0,0,0.08)",
  },
  navLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  navBrand: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "0.5px solid rgba(0,0,0,0.1)",
  },
  navLogin: {
    fontSize: "13px",
    color: "#555",
  },
  logoutBtn: {
    fontSize: "13px",
    padding: "5px 12px",
    background: "transparent",
    border: "0.5px solid rgba(0,0,0,0.15)",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#555",
  },
  main: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  successBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#f0fdf4",
    border: "0.5px solid #86efac",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#15803d",
    marginBottom: "1.5rem",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "1.5rem",
  },
  metricCard: {
    background: "#ffffff",
    border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: "10px",
    padding: "1rem",
  },
  metricLabel: {
    fontSize: "12px",
    color: "#999",
    marginBottom: "6px",
  },
  metricValue: {
    fontSize: "24px",
    fontWeight: "500",
    color: "#1a1a1a",
  },
  panel: {
    background: "#ffffff",
    border: "0.5px solid rgba(0,0,0,0.08)",
    borderRadius: "12px",
    overflow: "hidden",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 1.25rem",
    borderBottom: "0.5px solid rgba(0,0,0,0.06)",
  },
  panelTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1a1a1a",
  },
  panelBadge: {
    fontSize: "11px",
    padding: "3px 8px",
    background: "#f4f3ee",
    color: "#888",
    borderRadius: "20px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "3rem 1rem",
    gap: "12px",
  },
  emptyText: {
    fontSize: "13px",
    color: "#999",
    margin: 0,
    textAlign: "center",
  },
  connectBtn: {
    fontSize: "13px",
    padding: "8px 16px",
    background: "#f4f3ee",
    border: "0.5px solid rgba(0,0,0,0.1)",
    borderRadius: "6px",
    color: "#aaa",
    cursor: "not-allowed",
  },
};