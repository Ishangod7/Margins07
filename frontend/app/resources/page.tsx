import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { requireSession } from "@/lib/session";
import { apiFetch } from "@/lib/api";
import { SearchIcon } from "@/components/ui/Icons";
import {
  ResourceCard,
  ShelfHeaderActions,
  type SubjectItem,
  type ResourceItem,
} from "@/components/resources/ResourceTools";
import styles from "./resources.module.css";

const KINDS = [
  { key: "", label: "All Formats" },
  { key: "notes", label: "Notes" },
  { key: "pyq", label: "PYQs" },
  { key: "slides", label: "Slides" },
  { key: "book", label: "Books" },
  { key: "link", label: "Web Links" },
  { key: "assignment", label: "Assignments" },
];

export default async function ResourceShelfPage(props: {
  searchParams: Promise<{
    subject_id?: string;
    kind?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const { token, me } = await requireSession();
  const searchParams = await props.searchParams;

  const currentSubject = searchParams.subject_id ?? "";
  const currentKind = searchParams.kind ?? "";
  const currentQ = searchParams.q ?? "";
  const currentSort = searchParams.sort ?? "recent";

  // Build query string for API
  const queryParams = new URLSearchParams();
  if (currentSubject) queryParams.set("subject_id", currentSubject);
  if (currentKind) queryParams.set("kind", currentKind);
  if (currentQ) queryParams.set("q", currentQ);
  if (currentSort) queryParams.set("sort", currentSort);

  const [subjects, resources] = await Promise.all([
    apiFetch<SubjectItem[]>("/resources/subjects", token, { next: { revalidate: 300 } } as any).catch(() => [] as SubjectItem[]),
    apiFetch<ResourceItem[]>(`/resources?${queryParams.toString()}`, token).catch(() => [] as ResourceItem[]),
  ]);

  const totalResourceCount = subjects.reduce((acc, s) => acc + s.resource_count, 0);
  const isCr = me.profile?.role === "cr";

  return (
    <AppShell displayName={me.profile?.display_name}>
      {/* Shelf Cover */}
      <section className={`card ${styles.pageCover}`}>
        <div className={styles.coverText}>
          <h1>resource shelf</h1>
          <p>notes, PYQs & study links — curated and shared by Division A</p>
        </div>
        <ShelfHeaderActions subjects={subjects} />
      </section>

      {/* Search & Sort Controls */}
      <form method="GET" action="/resources" className={styles.controlBar}>
        {currentSubject && <input type="hidden" name="subject_id" value={currentSubject} />}
        {currentKind && <input type="hidden" name="kind" value={currentKind} />}

        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            name="q"
            defaultValue={currentQ}
            placeholder="Search notes, PYQs, topics..."
            className={styles.searchInput}
          />
        </div>

        <select
          name="sort"
          defaultValue={currentSort}
          className={styles.sortSelect}
          // auto submit on change
        >
          <option value="recent">Sort: Most Recent</option>
          <option value="popular">Sort: Most Saved</option>
          <option value="downloads">Sort: Most Downloaded</option>
        </select>

        <button type="submit" className="btn small">
          Filter
        </button>
      </form>

      {/* Subject Filter Pills */}
      <div className={styles.subjectBar}>
        <Link
          href={`/resources?${new URLSearchParams({
            ...(currentKind ? { kind: currentKind } : {}),
            ...(currentQ ? { q: currentQ } : {}),
            ...(currentSort ? { sort: currentSort } : {}),
          }).toString()}`}
          className={`${styles.subjectPill} ${!currentSubject ? styles.subjectPillActive : ""}`}
        >
          <span>All Subjects</span>
          <span className={styles.pillCount}>{totalResourceCount}</span>
        </Link>

        {subjects.map((sub) => {
          const active = currentSubject === sub.id;
          const params = new URLSearchParams({
            subject_id: sub.id,
            ...(currentKind ? { kind: currentKind } : {}),
            ...(currentQ ? { q: currentQ } : {}),
            ...(currentSort ? { sort: currentSort } : {}),
          });
          return (
            <Link
              key={sub.id}
              href={`/resources?${params.toString()}`}
              className={`${styles.subjectPill} ${active ? styles.subjectPillActive : ""}`}
            >
              <span>{sub.code || sub.name}</span>
              <span className={styles.pillCount}>{sub.resource_count}</span>
            </Link>
          );
        })}
      </div>

      {/* Kind Filter Chips */}
      <div className={styles.kindBar}>
        {KINDS.map((k) => {
          const active = currentKind === k.key;
          const params = new URLSearchParams({
            ...(currentSubject ? { subject_id: currentSubject } : {}),
            ...(k.key ? { kind: k.key } : {}),
            ...(currentQ ? { q: currentQ } : {}),
            ...(currentSort ? { sort: currentSort } : {}),
          });
          return (
            <Link
              key={k.key}
              href={`/resources?${params.toString()}`}
              className={`${styles.kindChip} ${active ? styles.kindChipActive : ""}`}
            >
              {k.label}
            </Link>
          );
        })}
      </div>

      {/* Resource Cards Grid */}
      {resources.length > 0 ? (
        <div className={styles.resourceGrid}>
          {resources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              currentUserId={me.id}
              isCr={isCr}
            />
          ))}
        </div>
      ) : (
        <div className={`card ${styles.emptyShelf}`}>
          <h3>the shelf is empty here</h3>
          <p>
            {currentQ || currentSubject || currentKind
              ? "No resources match your current search and filters. Try clearing your search."
              : "No resources have been shared in this section yet. Be the first to upload lecture notes or a PYQ!"}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            {(currentQ || currentSubject || currentKind) && (
              <Link href="/resources" className="btn">
                Clear Filters
              </Link>
            )}
            <ShelfHeaderActions subjects={subjects} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
