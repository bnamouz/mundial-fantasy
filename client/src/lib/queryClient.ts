import { QueryClient } from "@tanstack/react-query";

const API_BASE = (window as any).__PORT_5000__ ?? "";

export async function apiRequest(method: string, path: string, body?: any) {
  const token = (window as any).__authToken__;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const [path] = queryKey as string[];
        return apiRequest("GET", path);
      },
    },
  },
});
