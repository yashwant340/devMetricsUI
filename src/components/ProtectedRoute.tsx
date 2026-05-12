import { useEffect, useState, type JSX, type ReactNode } from "react";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps): JSX.Element {
  const [status, setStatus] = useState<"checking" | "ok" | "fail">("checking");

  useEffect(() => {
    fetch("http://localhost:8080/api/auth/me", {
      credentials: "include",
    })
      .then((res: Response) => setStatus(res.ok ? "ok" : "fail"))
      .catch(() => setStatus("fail"));
  }, []);

  if (status === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "2px solid #e5e5e5",
            borderTop: "2px solid #1a1a1a",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "fail") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}