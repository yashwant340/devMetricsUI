const BASE = "http://localhost:8080";

type ApiFetchOptions = RequestInit & {
  headers?: Record<string, string>;
};

async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const res: Response = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  // Access token expired — try refreshing once
  if (res.status === 401) {
    const refreshed: Response = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshed.ok) {
      // Retry original request
      return fetch(`${BASE}${path}`, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
    } else {
      // Refresh token expired → redirect to login
      window.location.href = "/login";
      return refreshed;
    }
  }

  return res;
}

export default apiFetch;