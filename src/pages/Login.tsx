import React, { type JSX } from "react";

export default function Login(): JSX.Element {
  const handleGitHubLogin = (): void => {
    // Sends the browser to Spring Boot, which redirects to GitHub
    window.location.href = "http://localhost:8080/oauth2/authorization/github";
  };

  const params = new URLSearchParams(window.location.search);
  const hasError: string | null = params.get("error");

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
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
        </div>

        <h1 style={styles.title}>DevMetrics</h1>
        <p style={styles.sub}>
          AI-powered code review dashboard for engineering teams
        </p>

        {hasError && (
          <div style={styles.errorBanner}>
            Login failed — please try again
          </div>
        )}

        <button style={styles.githubBtn} onClick={handleGitHubLogin}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ flexShrink: 0 }}
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205
              11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235
              -3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23
              -1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845
              1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765
              -1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385
              1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3
              1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56
              3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23
              1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375
              .81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225
              .69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        <p style={styles.disclaimer}>
          We request access to your repositories to analyze PR and commit data.
          Your code is never stored.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f7",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "1rem",
  },
  card: {
    background: "#ffffff",
    border: "0.5px solid rgba(0,0,0,0.1)",
    borderRadius: "16px",
    padding: "2.5rem 2rem",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 8px",
    color: "#1a1a1a",
  },
  sub: {
    fontSize: "14px",
    color: "#666",
    margin: "0 0 2rem",
    lineHeight: "1.5",
  },
  errorBanner: {
    background: "#fef2f2",
    border: "0.5px solid #fca5a5",
    borderRadius: "8px",
    color: "#b91c1c",
    fontSize: "13px",
    padding: "10px 14px",
    marginBottom: "1rem",
  },
  githubBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "11px 20px",
    background: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  disclaimer: {
    fontSize: "12px",
    color: "#999",
    marginTop: "1.25rem",
    lineHeight: "1.5",
  },
};