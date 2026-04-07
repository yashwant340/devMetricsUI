import { useEffect, useState, type JSX } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("Signing you in...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("Login failed — no token received.");
      setTimeout(() => {
        navigate("/login?error=missing_token", { replace: true });
      }, 2000);
      return;
    }

    // Save the JWT
    sessionStorage.setItem("devmetrics_token", token);

    setStatus("Success! Taking you to your dashboard...");

    setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 800);
  }, [searchParams, navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <p style={styles.text}>{status}</p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  spinner: {
    width: "28px",
    height: "28px",
    border: "2px solid #e5e5e5",
    borderTop: "2px solid #1a1a1a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  text: {
    fontSize: "14px",
    color: "#666",
    margin: 0,
  },
};