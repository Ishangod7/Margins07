import AppShell from "@/components/layout/AppShell";
import { NoticeBoardClient } from "@/components/notices/NoticeTools";
import { apiFetch, ApiError, type Notice } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { DocIcon, PinIcon } from "@/components/ui/Icons";
import styles from "./notices.module.css";

export const metadata = {
  title: "Notice Board | Margins",
  description: "Official class announcements, exam notifications, and assignment deadlines for TCET Mumbai AI&DS.",
};

export default async function NoticeBoardPage() {
  const { token, me } = await requireSession();
  let notices: Notice[] = [];
  let error: string | null = null;
  try {
    notices = await apiFetch<Notice[]>("/notices", token);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Couldn't reach the server";
  }

  const isCr = me.profile?.role === "cr";
  const pinnedCount = notices.filter((n) => n.is_pinned).length;

  return (
    <AppShell noticeCount={notices.length} displayName={me.profile?.display_name}>
      {/* Cover Header */}
      <section className={`card ${styles.pageCover}`}>
        <div className={styles.coverText}>
          <h1>notice board</h1>
          <p>
            Official class announcements, exam schedules, and submission deadlines for Division A.
          </p>
        </div>
        <div className={styles.coverStats}>
          <div className={styles.statBadge}>
            <DocIcon size={15} aria-hidden="true" />
            <span>{notices.length} Notices</span>
          </div>
          {pinnedCount > 0 && (
            <div className={styles.statBadgePinned}>
              <PinIcon size={14} aria-hidden="true" />
              <span>{pinnedCount} Pinned</span>
            </div>
          )}
        </div>
      </section>

      {error ? (
        <div className={`card ${styles.errorCard}`}>
          <p>Could not load notices: {error}</p>
        </div>
      ) : (
        <NoticeBoardClient initialNotices={notices} isCr={isCr} />
      )}
    </AppShell>
  );
}
