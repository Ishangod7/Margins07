import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apiFetch, ApiError, type Me } from "@/lib/api";

// Server-side: get the Supabase access token from the cookie session, then ask the API who we are.
// Cached per-request to avoid redundant network round-trips in Server Components.
export const requireSession = cache(async () => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/intro");
  const token = session.access_token;
  try {
    const me = await apiFetch<Me>("/me", token, { next: { revalidate: 120 } } as any);
    return { token, me };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login?expired=1");
    throw e;
  }
});
