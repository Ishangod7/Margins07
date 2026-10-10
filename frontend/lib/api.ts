// Frontend talks ONLY to the FastAPI backend. Supabase is used just to log in
// and hold the session; the access token is forwarded as a Bearer token.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Notice = {
  id: string; title: string; content: string; category: string;
  is_pinned: boolean; created_at: string; published_at: string;
  author_name: string | null;
};
export type Me = {
  id: string; email: string | null; class_id: string | null;
  profile: { display_name: string; role: "member" | "cr" } | null;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiFetch<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = body?.detail;
    throw new ApiError(res.status, typeof d === "string" ? d : "Something went wrong");
  }
  return body as T;
}
