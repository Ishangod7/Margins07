import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type RevisionResponse } from "@/lib/api";
import RevisionClient from "./RevisionClient";

export default async function RevisionPage() {
  const { token, me } = await requireSession();

  const data = await apiFetch<RevisionResponse>("/revision", token).catch(() => ({
    items: [],
    stats: {
      total_items: 0,
      formula_count: 0,
      pyq_count: 0,
      one_pager_count: 0,
      high_yield_count: 0,
    },
  }));

  return (
    <AppShell displayName={me.profile?.display_name}>
      <RevisionClient initialData={data} />
    </AppShell>
  );
}
