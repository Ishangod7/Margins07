import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type Doubt } from "@/lib/api";
import { ResourceCard, type ResourceItem } from "@/components/resources/ResourceTools";
import styles from "./activity.module.css";

interface ActivityResponse {
  doubts: Array<{
    id: string;
    title: string;
    status: string;
    answer_count: number;
    created_at: string;
    subject?: { name: string; code?: string };
  }>;
  answers: Array<{
    id: string;
    doubt_id: string;
    body: string;
    is_accepted: boolean;
    helpful_count: number;
    created_at: string;
    doubt?: { id: string; title: string; status: string };
  }>;
  resources: ResourceItem[];
}

export default async function PersonalActivityPage() {
  const { token, me } = await requireSession();

  let activity: ActivityResponse = { doubts: [], answers: [], resources: [] };
  try {
    activity = await apiFetch<ActivityResponse>("/me/activity", token);
  } catch (e) {
    console.error("Could not fetch user activity", e);
  }

  const isCr = me.profile?.role === "cr";

  return (
    <AppShell displayName={me.profile?.display_name}>
      {/* Cover Header */}
      <section className={`card ${styles.pageCover}`}>
        <div className={styles.coverText}>
          <h1>my desk activity</h1>
          <p>track the questions you&apos;ve asked, answers you&apos;ve provided, and study resources you&apos;ve shared</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/doubts" className="btn small yellow">
            + Ask a Doubt
          </Link>
          <Link href="/resources" className="btn small">
            + Upload Notes
          </Link>
        </div>
      </section>

      {/* Summary Metrics */}
      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>{activity.doubts.length}</div>
          <div className={styles.metricLabel}>Doubts Asked</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue} style={{ color: "#2e5927" }}>
            {activity.answers.length}
          </div>
          <div className={styles.metricLabel}>Answers Given</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue} style={{ color: "var(--red)" }}>
            {activity.resources.length}
          </div>
          <div className={styles.metricLabel}>Resources Uploaded</div>
        </div>
      </div>

      {/* 1. Questions Asked */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <span>💬 Questions You Asked</span>
          <span style={{ fontSize: "14px", color: "var(--ink-soft)" }}>({activity.doubts.length})</span>
        </h2>
      </div>

      {activity.doubts.length === 0 ? (
        <div className={styles.emptyState}>
          You haven&apos;t asked any doubts yet. Stuck on a question or assignment? Post it on the Doubt Board.
        </div>
      ) : (
        <div className={styles.activityList}>
          {activity.doubts.map((d) => (
            <Link key={d.id} href={`/doubts/${d.id}`} className={styles.activityItem}>
              <div className={styles.itemMain}>
                <span className={styles.itemHeading}>{d.title}</span>
                <span className={styles.itemSnippet}>
                  {d.subject ? `[${d.subject.name}] · ` : ""}{d.answer_count} {d.answer_count === 1 ? "answer" : "answers"}
                </span>
              </div>
              <span
                className={styles.itemBadge}
                style={{
                  background:
                    d.status === "solved"
                      ? "rgba(207, 224, 200, 0.7)"
                      : d.status === "answered"
                      ? "var(--blue-soft)"
                      : "var(--yellow-soft)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {d.status}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* 2. Solutions Provided */}
      <div className={styles.sectionHeader} style={{ marginTop: "36px" }}>
        <h2 className={styles.sectionTitle}>
          <span>💡 Peer Answers & Solutions</span>
          <span style={{ fontSize: "14px", color: "var(--ink-soft)" }}>({activity.answers.length})</span>
        </h2>
      </div>

      {activity.answers.length === 0 ? (
        <div className={styles.emptyState}>
          You haven&apos;t answered any questions yet. Browse the Doubt Board to help classmates and earn helpful votes.
        </div>
      ) : (
        <div className={styles.activityList}>
          {activity.answers.map((a) => (
            <Link key={a.id} href={`/doubts/${a.doubt_id}`} className={styles.activityItem}>
              <div className={styles.itemMain}>
                <span className={styles.itemHeading}>
                  {a.doubt?.title ?? "Class doubt answer"}
                </span>
                <span className={styles.itemSnippet}>
                  &ldquo;{a.body.slice(0, 90)}...&rdquo;
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                {a.is_accepted && (
                  <span className={styles.itemBadge} style={{ background: "#cfe0c8", color: "#2e5927", fontWeight: 700 }}>
                    ✓ SOLVED
                  </span>
                )}
                <span className={styles.itemBadge}>
                  ▲ {a.helpful_count} helpful
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 3. Resources Shared */}
      <div className={styles.sectionHeader} style={{ marginTop: "36px" }}>
        <h2 className={styles.sectionTitle}>
          <span>📚 Shared Study Resources</span>
          <span style={{ fontSize: "14px", color: "var(--ink-soft)" }}>({activity.resources.length})</span>
        </h2>
      </div>

      {activity.resources.length === 0 ? (
        <div className={styles.emptyState}>
          You haven&apos;t uploaded any resources yet. Share lecture notes, assignments, or PYQs with your classmates.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "18px" }}>
          {activity.resources.map((r) => (
            <ResourceCard key={r.id} resource={r} currentUserId={me.id} isCr={isCr} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
