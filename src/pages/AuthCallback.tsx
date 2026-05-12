import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback(): JSX.Element {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("Signing you in...");

  useEffect(() => {
    fetch("http://localhost:8080/api/auth/me", {
      credentials: "include",
    })
      .then((res: Response) => {
        if (res.ok) {
          setStatus("Success! Taking you to your dashboard...");
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 800);
        } else {
          throw new Error("Auth check failed");
        }
      })
      .catch(() => {
        setStatus("Login failed — please try again.");
        setTimeout(() => {
          navigate("/login?error=auth_failed", { replace: true });
        }, 2000);
      });
  }, [navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <p style={styles.text}>{status}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles: {
  page: React.CSSProperties;
  card: React.CSSProperties;
  spinner: React.CSSProperties;
  text: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f7",
    fontFamily: "system-ui, sans-serif",
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