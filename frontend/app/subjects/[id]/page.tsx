import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type SubjectDetailResponse } from "@/lib/api";
import SubjectHubClient from "./SubjectHubClient";

export default async function SubjectDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { token, me } = await requireSession();
  const { id } = await props.params;

  let detail: SubjectDetailResponse | null = null;
  try {
    detail = await apiFetch<SubjectDetailResponse>(`/subjects/${id}`, token);
  } catch (err: any) {
    if (err?.status === 404) {
      notFound();
    }
    // Fallback if network or server error
  }

  if (!detail) {
    return (
      <AppShell displayName={me.profile?.display_name}>
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2 style={{ font: "700 32px / 1 'Caveat', cursive", marginBottom: "8px" }}>
            Subject hub unavailable
          </h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: "16px" }}>
            We could not load this subject right now. Please try again.
          </p>
          <Link href="/subjects" className="btn yellow">
            &larr; Return to all subjects
          </Link>
        </div>
      </AppShell>
    );
  }

  const isCr = me.profile?.role === "cr";

  return (
    <AppShell displayName={me.profile?.display_name}>
      <SubjectHubClient
        detail={detail}
        currentUserId={me.id}
        isCr={isCr}
      />
    </AppShell>
  );
}
