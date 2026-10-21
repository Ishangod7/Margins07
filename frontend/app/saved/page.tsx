import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type Doubt } from "@/lib/api";
import { ResourceCard, type ResourceItem } from "@/components/resources/ResourceTools";
import { DoubtCard } from "@/components/doubts/DoubtTools";
import styles from "./saved.module.css";

interface SavedResponse {
  saved_resources: ResourceItem[];
  followed_doubts: Doubt[];
}

export default async function SavedShelfPage() {
  const { token, me } = await requireSession();

  let savedData: SavedResponse = { saved_resources: [], followed_doubts: [] };
  try {
    savedData = await apiFetch<SavedResponse>("/me/saved", token);
  } catch (e) {
    console.error("Could not fetch saved items", e);
  }

  const isCr = me.profile?.role === "cr";
  const totalSaved =
    (savedData.saved_resources?.length ?? 0) + (savedData.followed_doubts?.length ?? 0);

  return (
    <AppShell displayName={me.profile?.display_name}>
      {/* Cover Header */}
      <section className={`card ${styles.pageCover}`}>
        <div className={styles.coverText}>
          <h1>saved shelf</h1>
          <p>your personal bookmark collection of notes, PYQs, and followed questions</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/resources" className="btn small yellow">
            Browse Shelf →
          </Link>
          <Link href="/doubts" className="btn small">
            Doubt Board →
          </Link>
        </div>
      </section>

      {totalSaved === 0 ? (
        <div className={styles.emptyBlock} style={{ padding: "60px 20px" }}>
          <h4>your personal shelf is empty</h4>
          <p>
            You haven&apos;t saved any study materials or followed any doubts yet. Star notes on the Resource Shelf or follow doubts to access them quickly here.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
            <Link href="/resources" className="btn yellow small">
              Explore Resources
            </Link>
            <Link href="/doubts" className="btn small">
              Browse Doubts
            </Link>
          </div>
        </div>
      ) : (
        <div>
          {/* Section 1: Saved Notes & Files */}
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span>Saved Resources</span>
              <span className={styles.itemCount}>
                {savedData.saved_resources.length}
              </span>
            </h2>
          </div>

          {savedData.saved_resources.length === 0 ? (
            <div className={styles.emptyBlock}>
              <h4>no saved resources</h4>
              <p>Star lecture notes, formula sheets, or PYQs to keep them here for exam prep.</p>
            </div>
          ) : (
            <div className={styles.resourceGrid}>
              {savedData.saved_resources.map((res) => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  currentUserId={me.id}
                  isCr={isCr}
                />
              ))}
            </div>
          )}

          {/* Section 2: Followed Doubts */}
          <div className={styles.sectionHeader} style={{ marginTop: "36px" }}>
            <h2 className={styles.sectionTitle}>
              <span>Followed Doubts</span>
              <span className={styles.itemCount}>
                {savedData.followed_doubts.length}
              </span>
            </h2>
          </div>

          {savedData.followed_doubts.length === 0 ? (
            <div className={styles.emptyBlock}>
              <h4>no followed doubts</h4>
              <p>Follow tricky doubts on the board to track when classmates post answers.</p>
            </div>
          ) : (
            <div className={styles.doubtList}>
              {savedData.followed_doubts.map((doubt) => (
                <DoubtCard key={doubt.id} doubt={doubt} token={token} />
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
