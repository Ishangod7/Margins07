import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type Doubt, type Subject } from "@/lib/api";
import { SearchIcon } from "@/components/ui/Icons";
import { DoubtCard, DoubtComposer } from "@/components/doubts/DoubtTools";
import styles from "./doubts.module.css";

const STATUS_FILTERS = [
  { key: "", label: "All Status" },
  { key: "open", label: "Open" },
  { key: "answered", label: "Answered" },
  { key: "solved", label: "Solved ✓" },
];

export default async function DoubtBoardPage(props: {
  searchParams: Promise<{
    subject_id?: string;
    status?: string;
    mine?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const { token, me } = await requireSession();
  const searchParams = await props.searchParams;

  const currentSubject = searchParams.subject_id ?? "";
  const currentStatus = searchParams.status ?? "";
  const isMine = searchParams.mine === "true";
  const currentQ = searchParams.q ?? "";
  const currentSort = searchParams.sort ?? "recent";

  const queryParams = new URLSearchParams();
  if (currentSubject) queryParams.set("subject_id", currentSubject);
  if (currentStatus) queryParams.set("status", currentStatus);
  if (isMine) queryParams.set("mine", "true");
  if (currentQ) queryParams.set("q", currentQ);
  if (currentSort) queryParams.set("sort", currentSort);

  const [subjects, doubts] = await Promise.all([
    apiFetch<Subject[]>("/resources/subjects", token).catch(() => [] as Subject[]),
    apiFetch<Doubt[]>(`/doubts?${queryParams.toString()}`, token).catch(() => [] as Doubt[]),
  ]);

  return (
    <AppShell displayName={me.profile?.display_name}>
      <section className={styles.pageCover}>
        <h1>doubt board</h1>
        <p>ask questions, get peer explanations, and mark solved solutions.</p>
      </section>

      <div className={styles.actionBar}>
        <form method="GET" action="/doubts" className={styles.searchWrap}>
          <SearchIcon size={16} />
          <input
            name="q"
            defaultValue={currentQ}
            placeholder="Search doubts or keywords..."
            className={styles.searchInput}
          />
          {currentSubject && <input type="hidden" name="subject_id" value={currentSubject} />}
          {currentStatus && <input type="hidden" name="status" value={currentStatus} />}
        </form>

        <DoubtComposer subjects={subjects} token={token} />
      </div>

      <section className={styles.filtersSection}>
        {/* Status Filters */}
        <div className={styles.pillRow}>
          <span className={styles.pillLabel}>Status:</span>
          {STATUS_FILTERS.map((f) => {
            const params = new URLSearchParams(queryParams);
            if (f.key) params.set("status", f.key);
            else params.delete("status");
            const active = currentStatus === f.key && !isMine;
            return (
              <Link
                key={f.key}
                href={`/doubts?${params.toString()}`}
                className={`${styles.pill} ${active ? styles.pillActive : ""}`}
              >
                {f.label}
              </Link>
            );
          })}
          {/* Mine toggle */}
          <Link
            href={
              isMine
                ? (() => {
                    const p = new URLSearchParams(queryParams);
                    p.delete("mine");
                    return `/doubts?${p.toString()}`;
                  })()
                : (() => {
                    const p = new URLSearchParams(queryParams);
                    p.set("mine", "true");
                    return `/doubts?${p.toString()}`;
                  })()
            }
            className={`${styles.pill} ${isMine ? styles.pillActive : ""}`}
          >
            My Doubts
          </Link>
        </div>

        {/* Subjects Pills */}
        <div className={styles.pillRow}>
          <span className={styles.pillLabel}>Subject:</span>
          <Link
            href={(() => {
              const p = new URLSearchParams(queryParams);
              p.delete("subject_id");
              return `/doubts?${p.toString()}`;
            })()}
            className={`${styles.pill} ${!currentSubject ? styles.pillActive : ""}`}
          >
            All Subjects
          </Link>
          {subjects.map((s) => {
            const p = new URLSearchParams(queryParams);
            p.set("subject_id", s.id);
            const active = currentSubject === s.id;
            return (
              <Link
                key={s.id}
                href={`/doubts?${p.toString()}`}
                className={`${styles.pill} ${active ? styles.pillActive : ""}`}
              >
                {s.code || s.name}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Doubts Feed */}
      {doubts.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>no doubts found</h2>
          <p className={styles.emptyText}>
            {currentQ || currentSubject || currentStatus
              ? "Try clearing filters to see all class discussions."
              : "No questions asked yet. Be the first to start a discussion!"}
          </p>
        </div>
      ) : (
        <div className={styles.doubtList}>
          {doubts.map((d) => (
            <DoubtCard key={d.id} doubt={d} token={token} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
