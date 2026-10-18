import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type Person } from "@/lib/api";
import { SearchIcon, StarIcon, DocIcon } from "@/components/ui/Icons";
import styles from "./people.module.css";

const QUICK_SKILLS = [
  { key: "", label: "All Classmates" },
  { key: "Python", label: "Python" },
  { key: "DSA", label: "DSA" },
  { key: "ML", label: "Machine Learning" },
  { key: "React", label: "React" },
  { key: "DBMS", label: "DBMS" },
  { key: "Web Dev", label: "Web Dev" },
  { key: "Maths", label: "Maths" },
];

export default async function PeopleDirectoryPage(props: {
  searchParams: Promise<{ q?: string; skill?: string }>;
}) {
  const { token, me } = await requireSession();
  const searchParams = await props.searchParams;

  const currentQ = searchParams.q ?? "";
  const currentSkill = searchParams.skill ?? "";

  const queryParams = new URLSearchParams();
  if (currentQ) queryParams.set("q", currentQ);
  if (currentSkill) queryParams.set("skill", currentSkill);

  const people = await apiFetch<Person[]>(
    `/people?${queryParams.toString()}`,
    token
  ).catch(() => [] as Person[]);

  return (
    <AppShell displayName={me.profile?.display_name}>
      {/* Directory Cover */}
      <section className={`card ${styles.pageCover}`}>
        <div className={styles.coverText}>
          <h1>class directory</h1>
          <p>AI&DS Division A peers, project collaborators & study partners</p>
        </div>
        <Link href="/settings" className={`btn yellow ${styles.myProfileBtn}`}>
          ✎ Edit My Profile
        </Link>
      </section>

      {/* Search Bar */}
      <form method="GET" action="/people" className={styles.controlBar}>
        {currentSkill && <input type="hidden" name="skill" value={currentSkill} />}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            name="q"
            defaultValue={currentQ}
            placeholder="Search classmates by name, skill, or keyword..."
            className={styles.searchInput}
          />
        </div>
        <button type="submit" className="btn small">
          Search
        </button>
      </form>

      {/* Skill Quick-Filter Chips */}
      <div className={styles.skillFilterBar}>
        {QUICK_SKILLS.map((s) => {
          const isActive = currentSkill.toLowerCase() === s.key.toLowerCase();
          const targetUrl = s.key
            ? `/people?${new URLSearchParams({
                ...(currentQ ? { q: currentQ } : {}),
                skill: s.key,
              }).toString()}`
            : currentQ
            ? `/people?q=${encodeURIComponent(currentQ)}`
            : "/people";

          return (
            <Link
              key={s.key}
              href={targetUrl}
              className={`${styles.skillChip} ${isActive ? styles.skillChipActive : ""}`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Classmates Grid */}
      {people.length === 0 ? (
        <div className={styles.emptyDirectory}>
          <h3>no classmates found</h3>
          <p>
            No active student matched {currentQ ? `"${currentQ}"` : "this skill filter"}. Try a different search keyword or clear the filter.
          </p>
          <Link href="/people" className="btn small yellow">
            Clear Filters
          </Link>
        </div>
      ) : (
        <div className={styles.peopleGrid}>
          {people.map((p) => {
            const isCR = p.role === "cr";
            const isSelf = p.is_self;

            return (
              <Link
                key={p.id}
                href={`/people/${p.id}`}
                className={styles.personCard}
              >
                <div className={styles.cardHead}>
                  <div
                    className={`${styles.avatarCircle} ${
                      isCR ? styles.avatarCR : isSelf ? styles.avatarSelf : ""
                    }`}
                  >
                    {p.initials}
                  </div>
                  <div className={styles.cardHeadInfo}>
                    <div className={styles.nameRow}>
                      <span className={styles.personName}>{p.display_name}</span>
                      {isCR && <span className={`${styles.roleBadge} ${styles.roleCR}`}>CR</span>}
                      {isSelf && <span className={styles.selfBadge}>YOU</span>}
                    </div>
                  </div>
                </div>

                {p.bio ? (
                  <p className={styles.bioText}>{p.bio}</p>
                ) : (
                  <p className={styles.bioEmpty}>Keeping things quiet ✎</p>
                )}

                {/* Skills */}
                {p.skills && p.skills.length > 0 && (
                  <div className={styles.pillRow}>
                    {p.skills.slice(0, 4).map((sk, idx) => (
                      <span key={idx} className={styles.skillPill}>
                        #{sk}
                      </span>
                    ))}
                    {p.skills.length > 4 && (
                      <span className={styles.skillPill}>+{p.skills.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Can Help With */}
                {p.can_help_with && p.can_help_with.length > 0 && (
                  <div className={styles.helpBox}>
                    <span>🤝 Helps with:</span>
                    <strong>{p.can_help_with.slice(0, 2).join(", ")}</strong>
                  </div>
                )}

                {/* Card Footer */}
                <div className={styles.cardFooter}>
                  {p.contributions ? (
                    <span className={styles.statTag}>
                      {p.contributions.resources_count} resources · {p.contributions.answers_count} answers
                    </span>
                  ) : (
                    <span>Division A member</span>
                  )}
                  <span className={styles.viewProfileLink}>view profile →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
