import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type PersonDetail } from "@/lib/api";
import { CheckIcon, DocIcon } from "@/components/ui/Icons";
import styles from "../people.module.css";

export default async function PersonProfilePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { token, me } = await requireSession();
  const { id } = await props.params;

  let person: PersonDetail | null = null;
  try {
    person = await apiFetch<PersonDetail>(`/people/${id}`, token);
  } catch (err) {
    notFound();
  }

  if (!person) {
    notFound();
  }

  const isCR = person.role === "cr";
  const isSelf = person.is_self;

  return (
    <AppShell displayName={me.profile?.display_name}>
      <div className={styles.detailHeader}>
        <Link href="/people" className={styles.backLink}>
          ← Back to class directory
        </Link>
      </div>

      {/* Main Profile Header */}
      <section className={styles.profileCover}>
        <div className={styles.profileHeaderFlex}>
          <div
            className={`${styles.largeAvatar} ${
              isCR ? styles.largeAvatarCR : ""
            }`}
          >
            {person.initials}
          </div>

          <div className={styles.profileTitleArea}>
            <div className={styles.nameRow}>
              <h1>{person.display_name}</h1>
              {isCR && <span className={`${styles.roleBadge} ${styles.roleCR}`}>CLASS REPRESENTATIVE</span>}
              {isSelf && <span className={styles.selfBadge}>YOU</span>}
            </div>

            <div className={styles.metaRow}>
              <span>TCET Mumbai · AI&DS Division A</span>
              {person.joined_at && (
                <>
                  <span>•</span>
                  <span>Joined {new Date(person.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                </>
              )}
            </div>

            {isSelf && (
              <div style={{ marginTop: "12px" }}>
                <Link href="/settings" className="btn small yellow">
                  ✎ Edit Profile & Privacy Settings
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Profile Details Grid */}
      <div className={styles.profileGrid}>
        {/* Left Column: About & Skills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className={styles.sectionBox}>
            <h3>about me</h3>
            {person.bio ? (
              <p>{person.bio}</p>
            ) : (
              <p style={{ fontStyle: "italic", color: "#8c897f" }}>
                {person.display_name} hasn&apos;t written a bio yet.
              </p>
            )}
          </div>

          <div className={styles.sectionBox}>
            <h3>skills & tools</h3>
            {person.skills && person.skills.length > 0 ? (
              <div className={styles.pillRow}>
                {person.skills.map((s, idx) => (
                  <span key={idx} className={styles.skillPill} style={{ fontSize: "13px", padding: "4px 10px" }}>
                    #{s}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ fontStyle: "italic", color: "#8c897f" }}>No skills listed.</p>
            )}

            {person.interests && person.interests.length > 0 && (
              <>
                <h4 style={{ fontFamily: "Patrick Hand, cursive", fontSize: "16px", marginTop: "16px", marginBottom: "8px", color: "var(--ink)" }}>
                  interests & passions
                </h4>
                <div className={styles.pillRow}>
                  {person.interests.map((it, idx) => (
                    <span key={idx} className={styles.skillPill} style={{ background: "var(--yellow-soft)" }}>
                      {it}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Helping, Learning & Contributions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className={styles.sectionBox}>
            <h3>collaborations</h3>
            {person.can_help_with && person.can_help_with.length > 0 ? (
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase" }}>
                  can help peers with:
                </span>
                <div className={styles.pillRow} style={{ marginTop: "6px" }}>
                  {person.can_help_with.map((h, idx) => (
                    <span key={idx} className={styles.skillPill} style={{ background: "rgba(220, 235, 220, 0.7)", borderColor: "#40683a" }}>
                      🤝 {h}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {person.currently_learning && person.currently_learning.length > 0 ? (
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase" }}>
                  currently learning:
                </span>
                <div className={styles.pillRow} style={{ marginTop: "6px" }}>
                  {person.currently_learning.map((l, idx) => (
                    <span key={idx} className={styles.skillPill} style={{ background: "var(--blue-soft)", borderColor: "var(--blue)" }}>
                      📖 {l}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {!person.can_help_with?.length && !person.currently_learning?.length && (
              <p style={{ fontStyle: "italic", color: "#8c897f" }}>
                No collaboration preferences listed yet.
              </p>
            )}
          </div>

          {/* Contributions Box */}
          {person.contributions ? (
            <div className={styles.sectionBox}>
              <h3>contributions to division a</h3>
              <div style={{ display: "flex", gap: "14px", marginBottom: "16px" }}>
                <div className="card" style={{ padding: "10px 14px", flex: 1, textAlign: "center" }}>
                  <div style={{ font: "700 24px/1 'Caveat', cursive", color: "var(--blue-dark)" }}>
                    {person.contributions.resources_count}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Resources Shared</div>
                </div>
                <div className="card" style={{ padding: "10px 14px", flex: 1, textAlign: "center" }}>
                  <div style={{ font: "700 24px/1 'Caveat', cursive", color: "#2e5927" }}>
                    {person.contributions.answers_count}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>Doubts Answered</div>
                </div>
              </div>

              {/* Recent Resources */}
              {person.contributions.recent_resources && person.contributions.recent_resources.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <h4 style={{ fontFamily: "Patrick Hand, cursive", fontSize: "16px", marginBottom: "6px" }}>
                    shared notes & materials
                  </h4>
                  {person.contributions.recent_resources.slice(0, 4).map((r) => (
                    <div key={r.id} className={styles.contributionItem}>
                      <span className={styles.contributionTitle}>{r.title}</span>
                      <span className={styles.contributionMeta}>
                        {r.download_count} downloads · {r.save_count} saves
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Answers */}
              {person.contributions.recent_answers && person.contributions.recent_answers.length > 0 && (
                <div style={{ marginTop: "14px" }}>
                  <h4 style={{ fontFamily: "Patrick Hand, cursive", fontSize: "16px", marginBottom: "6px" }}>
                    recent answers
                  </h4>
                  {person.contributions.recent_answers.slice(0, 4).map((a) => (
                    <div key={a.id} className={styles.contributionItem}>
                      <div>
                        {a.doubt ? (
                          <Link href={`/doubts/${a.doubt.id}`} className={styles.contributionTitle}>
                            {a.doubt.title}
                          </Link>
                        ) : (
                          <span className={styles.contributionTitle}>Class doubt solution</span>
                        )}
                        <p style={{ fontSize: "11px", color: "var(--ink-soft)", marginTop: "2px" }}>
                          {a.body.slice(0, 60)}...
                        </p>
                      </div>
                      {a.is_accepted && (
                        <span style={{ fontSize: "10px", color: "#2e5927", fontWeight: 700, whiteSpace: "nowrap" }}>
                          ✓ ACCEPTED
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
