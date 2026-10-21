import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type DeadlinesResponse } from "@/lib/api";
import DeadlinesClient from "./DeadlinesClient";

export default async function DeadlinesPage() {
  const { token, me } = await requireSession();

  const data = await apiFetch<DeadlinesResponse>("/deadlines", token).catch(() => ({
    deadlines: [],
    stats: {
      total_count: 0,
      pending_count: 0,
      completed_count: 0,
      urgent_count: 0,
      next_deadline: null,
    },
  }));

  const isCr = me.profile?.role === "cr";

  return (
    <AppShell displayName={me.profile?.display_name}>
      <DeadlinesClient initialData={data} isCr={isCr} />
    </AppShell>
  );
}
