import AppShell from "@/components/layout/AppShell";
import { NoticeComposer, NoticeActions } from "@/components/notices/NoticeTools";
import { apiFetch, ApiError, type Notice } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { DocIcon, PinIcon } from "@/components/ui/Icons";
import styles from "./notices.module.css";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function NoticeBoardPage() {
  const { token, me } = await requireSession();
  let notices: Notice[] = [];
  let error: string | null = null;
  try { notices = await apiFetch<Notice[]>("/notices", token); }
  catch (e) { error = e instanceof ApiError ? e.message : "Couldn't reach the server"; }

  const isCr = me.profile?.role === "cr";

  return (
    <AppShell noticeCount={notices.length} displayName={me.profile?.display_name}>
      <section className={`card ${styles.pageCover}`}>
        <h1>notice board</h1>
        <p>announcements & deadlines for the class, all in one place.</p>
      </section>

      {isCr && <NoticeComposer />}

      {error && <p className={styles.empty}>Couldn't load notices: {error}</p>}
      {!error && notices.length === 0 && (
        <div className={styles.empty}>
          <p>no notices yet</p>
          <p>class announcements will show up here</p>
        </div>
      )}

      {notices.map((n) => (
        <article key={n.id} className={`card ${styles.noticeCard}`}>
          <div className={styles.noticeCardGrid}>
            <div className={styles.miniIcon} aria-hidden="true">
              <DocIcon size={20} />
            </div>
            <div>
              <span className={styles.rowTag}>{n.category.toUpperCase()}</span>
              {n.is_pinned && (
                <span className={styles.pin}>
                  <PinIcon size={11} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 3 }} />
                  PINNED
                </span>
              )}
              <h3>{n.title}</h3>
              <p>{n.content}</p>
              {isCr && <NoticeActions id={n.id} pinned={n.is_pinned} />}
            </div>
            <div className={styles.noticeCardSide}>
              {n.author_name ?? "CR"}<br />{timeAgo(n.created_at)}
            </div>
          </div>
        </article>
      ))}
    </AppShell>
  );
}
