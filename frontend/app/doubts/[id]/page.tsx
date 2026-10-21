import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type Doubt } from "@/lib/api";
import { CheckIcon } from "@/components/ui/Icons";
import { AnswerCard, AnswerComposer } from "@/components/doubts/DoubtTools";
import styles from "../doubts.module.css";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function DoubtDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { token, me } = await requireSession();
  const { id } = await props.params;

  let doubt: (Doubt & { answers: any[] }) | null = null;
  try {
    doubt = await apiFetch<Doubt & { answers: any[] }>(`/doubts/${id}`, token);
  } catch (e) {
    notFound();
  }

  if (!doubt) {
    notFound();
  }

  const statusLabel =
    doubt.status === "solved" ? "SOLVED" : doubt.status === "answered" ? "ANSWERED" : "OPEN";

  const statusClass =
    doubt.status === "solved"
      ? styles.statusSolved
      : doubt.status === "answered"
      ? styles.statusAnswered
      : styles.statusOpen;

  return (
    <AppShell displayName={me.profile?.display_name}>
      <div className={styles.detailHeader}>
        <Link href="/doubts" className={styles.backLink}>
          ← Back to all doubts
        </Link>
      </div>

      <article className={styles.doubtCard} style={{ padding: "26px" }}>
        <div className={styles.cardHeader}>
          <div className={styles.badges}>
            <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
            {doubt.subject && <span className={styles.subjectBadge}>{doubt.subject.name}</span>}
          </div>
          <span className={styles.cardTime}>{timeAgo(doubt.created_at)}</span>
        </div>

        <h1 style={{ fontFamily: "DM Sans, sans-serif", fontSize: "24px", margin: "10px 0", color: "#282722" }}>
          {doubt.title}
        </h1>

        <div className={styles.doubtFullBody}>{doubt.body}</div>

        {doubt.tags && doubt.tags.length > 0 && (
          <div className={styles.tagRow}>
            {doubt.tags.map((t, idx) => (
              <span key={idx} className={styles.tag}>
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className={styles.cardFooter}>
          <div className={styles.footerLeft}>
            <span>
              asked by <strong className={styles.asker}>{doubt.author_name}</strong>
            </span>
          </div>
        </div>
      </article>

      {/* Answers Section */}
      <section className={styles.answersContainer}>
        <h2 className={styles.answersHeading}>
          Answers ({doubt.answers ? doubt.answers.length : 0})
        </h2>

        {(!doubt.answers || doubt.answers.length === 0) && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>no answers yet</h3>
            <p className={styles.emptyText}>Be the first to help your classmate out!</p>
          </div>
        )}

        {doubt.answers &&
          doubt.answers.map((ans) => (
            <AnswerCard
              key={ans.id}
              answer={ans}
              doubtAuthorId={doubt.created_by}
              currentUserId={me.id}
              token={token}
            />
          ))}

        <AnswerComposer doubtId={doubt.id} token={token} />
      </section>
    </AppShell>
  );
}
