import AppShell from "@/components/layout/AppShell";
import { apiFetch, type Notice } from "@/lib/api";
import { requireSession } from "@/lib/session";
import styles from "./home.module.css";

const ICONS: Record<string, string> = {
  Exam: "📄", Deadline: "📄", Assignment: "📄",
  Academic: "📚", General: "📚", Important: "✦",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default async function HomePage() {
  const { token, me } = await requireSession();
  const all = await apiFetch<Notice[]>("/notices", token).catch(() => [] as Notice[]);
  const profile = me.profile;
  const pinned = all.find((n) => n.is_pinned) ?? null;
  const noticeCount = all.length;
  const notices = all.slice(0, 4);

  const today = new Date();
  const weekday = today.toLocaleDateString("en-GB", { weekday: "long" });
  const dateLong = today.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const dateShort = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();

  return (
    <AppShell noticeCount={noticeCount} displayName={profile?.display_name}>
      <section className={styles.homeIntro}>
        <div>
          <div className="eyebrow">✎ {weekday}, {dateLong}</div>
          <h1>hey, {profile?.display_name?.split(" ")[0] ?? "student"}!</h1>
          <p>here's what's happening in your division today.</p>
        </div>
        <div className={styles.dateNote}>
          <small>TODAY</small>
          <strong>{dateShort}</strong>
          <small>{weekday}</small>
        </div>
      </section>

      <div className={styles.heroWrap}>
        <div className={styles.heroNote}>don't miss this!</div>
        <section className={`card ${styles.hero}`}>
          {pinned ? (
            <>
              <div className={styles.heroLabel}><span className={styles.heroDot}></span>IMPORTANT NOTICE</div>
              <h2>{pinned.title}</h2>
              <div className={styles.heroMeta}>
                <span>{pinned.category}</span><span>•</span><span>{fmtDate(new Date(pinned.created_at))}</span>
              </div>
              <div className={styles.heroActions}>
                <a href="/notices" className="btn yellow">read full notice →</a>
              </div>
            </>
          ) : (
            <>
              <div className={styles.heroLabel}><span className={styles.heroDot}></span>NO PINNED NOTICE</div>
              <h2>Nothing pinned right now</h2>
              <p className={styles.heroEmpty}>Your CR hasn't pinned anything yet — check the notice board for recent posts.</p>
              <div className={styles.heroActions}>
                <a href="/notices" className="btn">view notice board →</a>
              </div>
            </>
          )}
        </section>
      </div>

      <div className={styles.homeGrid}>
        <div className={styles.stack}>
          <section className={`card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <h3>today's notices ✎</h3>
              <a href="/notices">see everything →</a>
            </div>
            {(!notices || notices.length === 0) && (
              <p className={styles.emptyRow}>no notices yet — your CR's posts will show up here.</p>
            )}
            {notices?.map((n) => (
              <a key={n.id} href="/notices" className={styles.noticeRow}>
                <div className={styles.miniIcon}>{ICONS[n.category] ?? "📄"}</div>
                <div>
                  <span className={styles.rowTag}>{n.category.toUpperCase()}</span>
                  <div className={styles.rowTitle}>{n.title}</div>
                </div>
                <div className={styles.rowDate}>{fmtDate(new Date(n.created_at))}</div>
              </a>
            ))}
          </section>
        </div>

        <aside className={styles.stack}>
          <section className={`card ${styles.sticky}`}>
            <div className={styles.stickyTitle}>upcoming stuff ✦</div>
            <div className={styles.event}>
              <div className={styles.eventDate}>—<br />—</div>
              <div>
                <div className={styles.eventTitle}>No events added yet</div>
                <div className={styles.eventMeta}>CR can add these soon</div>
              </div>
            </div>
          </section>

          <section className={`card ${styles.panel}`}>
            <div className={styles.panelHead}><h3>quick stuff ✦</h3></div>
            <div className={styles.toolGrid}>
              <a href="/resources" className={styles.tool}>
                <div className={styles.toolIcon}>📚</div>
                <div className={styles.toolName}>resources</div>
                <div className={styles.toolDescription}>notes + PYQs</div>
              </a>
              <a href="/doubts" className={styles.tool}>
                <div className={styles.toolIcon}>💡</div>
                <div className={styles.toolName}>doubts</div>
                <div className={styles.toolDescription}>ask + answer</div>
              </a>
              <a href="/notices" className={styles.tool}>
                <div className={styles.toolIcon}>📌</div>
                <div className={styles.toolName}>notices</div>
                <div className={styles.toolDescription}>all announcements</div>
              </a>
              <a href="/settings" className={styles.tool}>
                <div className={styles.toolIcon}>⚙</div>
                <div className={styles.toolName}>settings</div>
                <div className={styles.toolDescription}>your profile</div>
              </a>
            </div>
          </section>

          <section className={`card ${styles.aiCard}`}>
            <div className={styles.aiTitle}>ask margins AI ✦</div>
            <div className={styles.aiText}>confused about a notice? ask me and I'll find the useful bits for you.</div>
            <button className="btn primary" style={{ marginTop: 14, width: "100%" }} disabled>coming soon →</button>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
