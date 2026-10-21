import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch, type SubjectHubItem } from "@/lib/api";
import {
  BookOpenIcon,
  DocIcon,
  DoubtIcon,
  PeopleIcon,
  SearchIcon,
} from "@/components/ui/Icons";
import styles from "./subjects.module.css";

export default async function SubjectsDirectoryPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { token, me } = await requireSession();
  const searchParams = await props.searchParams;
  const currentQ = (searchParams.q ?? "").trim().toLowerCase();

  const subjects = await apiFetch<SubjectHubItem[]>("/subjects", token).catch(
    () => [] as SubjectHubItem[]
  );

  const filteredSubjects = currentQ
    ? subjects.filter(
        (s) =>
          s.name.toLowerCase().includes(currentQ) ||
          (s.code && s.code.toLowerCase().includes(currentQ))
      )
    : subjects;

  const totalResources = subjects.reduce((sum, s) => sum + s.resource_count, 0);
  const totalDoubts = subjects.reduce((sum, s) => sum + s.doubt_count, 0);
  const totalMentors = subjects.reduce((sum, s) => sum + s.helper_count, 0);

  return (
    <AppShell displayName={me.profile?.display_name}>
      {/* Cover Header */}
      <section className={`card ${styles.pageCover}`}>
        <div className={styles.coverText}>
          <h1>subject hubs</h1>
          <p>
            Unified study shelves, syllabus notes, question papers, and classmate mentors for every subject
          </p>
        </div>
        <div className={styles.coverStats}>
          <div className={styles.statBadge}>
            <DocIcon size={16} aria-hidden="true" />
            <span>{totalResources} Resources</span>
          </div>
          <div className={styles.statBadge}>
            <DoubtIcon size={16} aria-hidden="true" />
            <span>{totalDoubts} Doubts</span>
          </div>
          <div className={styles.statBadge}>
            <PeopleIcon size={16} aria-hidden="true" />
            <span>{totalMentors} Mentors</span>
          </div>
        </div>
      </section>

      {/* Search Input Bar */}
      <form method="GET" action="/subjects" className={styles.searchBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search subjects by code (e.g. DBMS, ML, CN) or name..."
            className={styles.searchInput}
            aria-label="Search subjects"
          />
        </div>
      </form>

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>No matching subjects found</h2>
          <p>Try searching for a different code or subject name</p>
        </div>
      ) : (
        <div className={styles.subjectGrid}>
          {filteredSubjects.map((subj) => (
            <Link
              key={subj.id}
              href={`/subjects/${subj.id}`}
              className={styles.subjectCard}
            >
              <div>
                <div className={styles.cardTop}>
                  <span className={styles.codeBadge}>
                    {subj.code || subj.name.slice(0, 4).toUpperCase()}
                  </span>
                  {subj.semester && (
                    <span className={styles.semBadge}>{subj.semester}</span>
                  )}
                </div>

                <h2 className={styles.subjectTitle}>{subj.name}</h2>

                <div className={styles.metricsRow}>
                  <div className={styles.metricItem}>
                    <span className={styles.metricIcon} aria-hidden="true">
                      <DocIcon size={16} />
                    </span>
                    <span className={styles.metricVal}>{subj.resource_count}</span>
                    <span className={styles.metricLabel}>Notes & PYQs</span>
                  </div>

                  <div className={styles.metricItem}>
                    <span className={styles.metricIcon} aria-hidden="true">
                      <DoubtIcon size={16} />
                    </span>
                    <span className={styles.metricVal}>{subj.doubt_count}</span>
                    <span className={styles.metricLabel}>
                      Doubts {subj.solved_doubt_count > 0 ? `(${subj.solved_doubt_count} solved)` : ""}
                    </span>
                  </div>

                  <div className={styles.metricItem}>
                    <span className={styles.metricIcon} aria-hidden="true">
                      <PeopleIcon size={16} />
                    </span>
                    <span className={styles.metricVal}>{subj.helper_count}</span>
                    <span className={styles.metricLabel}>Peer Mentors</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.cardAction}>
                  Open Subject Hub &rarr;
                </span>
                <span aria-hidden="true">
                  <BookOpenIcon size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
