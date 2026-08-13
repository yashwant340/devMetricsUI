import React, { type JSX } from "react";

export default function Login(): JSX.Element {
  const handleGitHubLogin = (): void => {
    window.location.href = "http://localhost:8080/oauth2/authorization/github";
  };

  const params = new URLSearchParams(window.location.search);
  const hasError: string | null = params.get("error");

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.hero}>
          <div style={styles.brandMark}>
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="12" fill="url(#brandFill)" />
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
              <defs>
                <linearGradient id="brandFill" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0f172a" />
                  <stop offset="1" stopColor="#1e293b" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div style={styles.copy}>
            <div style={styles.kicker}>DevMetrics</div>
            <h1 style={styles.title}>See repo health at a glance.</h1>
            <p style={styles.sub}>
              A quiet, focused dashboard for comparing engineering activity, trends, and code quality.
            </p>
          </div>

          <div style={styles.bullets}>
            <span style={styles.bullet}>Repository comparison</span>
            <span style={styles.bullet}>Trend deltas</span>
            <span style={styles.bullet}>Insight cards</span>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardEyebrow}>Sign in</div>
            <div style={styles.cardTitle}>Continue with GitHub</div>
            <div style={styles.cardSubtitle}>
              We use GitHub access to read repository and contribution data.
            </div>
          </div>

          {hasError && (
            <div style={styles.errorBanner}>
              Login failed — please try again.
            </div>
          )}

          <button style={styles.githubBtn} onClick={handleGitHubLogin}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12C24 5.37 18.63 0 12 0z" />
            </svg>
            Continue with GitHub
          </button>

          <p style={styles.disclaimer}>
            Access is used to read repository metrics and activity trends. Your code is not stored.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100svh",
    width: "100%",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top left, rgba(224, 231, 255, 0.7), transparent 24%), radial-gradient(circle at bottom right, rgba(236, 253, 245, 0.8), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#0f172a",
    padding: "clamp(1rem, 2vw, 2rem)",
    boxSizing: "border-box",
  },
  shell: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1.25rem",
    alignItems: "center",
  },
  hero: {
    minHeight: "calc(100svh - 4rem)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "clamp(0.5rem, 2vw, 2rem)",
  },
  brandMark: {
    width: "fit-content",
    padding: "10px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(148,163,184,0.16)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
    marginBottom: "1.25rem",
  },
  copy: {
    maxWidth: "640px",
  },
  kicker: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#64748b",
    marginBottom: "10px",
  },
  title: {
    fontSize: "clamp(2.2rem, 5vw, 4.8rem)",
    lineHeight: 1.02,
    letterSpacing: "-0.04em",
    margin: 0,
    color: "#0f172a",
    maxWidth: "12ch",
  },
  sub: {
    margin: "1rem 0 0",
    maxWidth: "56ch",
    fontSize: "clamp(1rem, 1.4vw, 1.1rem)",
    lineHeight: 1.7,
    color: "#475569",
  },
  bullets: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
  bullet: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#334155",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(148,163,184,0.16)",
    borderRadius: "999px",
    padding: "8px 12px",
    boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    justifySelf: "end",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "28px",
    padding: "1.5rem",
    boxShadow: "0 24px 70px rgba(15,23,42,0.08)",
    backdropFilter: "blur(16px)",
  },
  cardHeader: {
    marginBottom: "1.25rem",
  },
  cardEyebrow: {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#0f766e",
    marginBottom: "8px",
  },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "6px",
  },
  cardSubtitle: {
    fontSize: "0.95rem",
    color: "#64748b",
    lineHeight: 1.6,
  },
  errorBanner: {
    background: "rgba(254,242,242,0.96)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: "16px",
    color: "#b91c1c",
    fontSize: "13px",
    padding: "12px 14px",
    marginBottom: "1rem",
  },
  githubBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "13px 18px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 14px 24px rgba(15,23,42,0.12)",
    transition: "transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
  },
  disclaimer: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "1rem",
    lineHeight: "1.6",
  },
};
