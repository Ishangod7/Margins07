"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type SubjectDetailResponse,
} from "@/lib/api";
import {
  ResourceCard,
  type ResourceItem,
} from "@/components/resources/ResourceTools";
import {
  BookOpenIcon,
  DocIcon,
  DoubtIcon,
  PeopleIcon,
  CheckIcon,
  MessageSquareIcon,
} from "@/components/ui/Icons";
import styles from "./subjectDetail.module.css";

type TabKey = "shelf" | "doubts" | "mentors";

export default function SubjectHubClient({
  detail,
  currentUserId,
  isCr,
}: {
  detail: SubjectDetailResponse;
  currentUserId?: string;
  isCr?: boolean;
}) {
  const { subject, resources, doubts, helpers, units, stats } = detail;

  const [activeTab, setActiveTab] = useState<TabKey>("shelf");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [doubtFilter, setDoubtFilter] = useState<"all" | "open" | "solved">("all");

  // Transform resources to match ResourceItem expected by ResourceCard
  const mappedResources: ResourceItem[] = resources.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    kind: r.kind,
    unit: r.unit,
    tags: r.tags,
    file_name: r.file_name,
    file_size: r.file_size,
    external_url: r.external_url,
    download_count: 0,
    save_count: r.save_count,
    is_saved: r.is_saved,
    author_name: r.uploader_name,
    created_by: r.uploader_id,
    created_at: r.created_at,
    subject: {
      id: subject.id,
      name: subject.name,
      code: subject.code,
    },
  }));

  // Filter resources by unit
  const filteredResources =
    selectedUnit === "all"
      ? mappedResources
      : mappedResources.filter((r) => r.unit === selectedUnit);

  // Filter doubts by status
  const filteredDoubts =
    doubtFilter === "all"
      ? doubts
      : doubts.filter((d) =>
          doubtFilter === "solved" ? d.status === "solved" : d.status !== "solved"
        );

  const unitKeys = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6"];

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <Link href="/subjects" className={styles.backLink}>
        &larr; Back to all subjects
      </Link>

      {/* Hero Header Card */}
      <section className={`card ${styles.heroCard}`}>
        <div className={styles.heroTop}>
          <div className={styles.badges}>
            <span className={styles.codeBadge}>
              {subject.code || subject.name.slice(0, 4).toUpperCase()}
            </span>
            {subject.semester && (
              <span className={styles.semBadge}>{subject.semester}</span>
            )}
          </div>

          <div className={styles.heroActions}>
            <Link
              href={`/resources?subject_id=${subject.id}#upload`}
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            >
              <DocIcon size={16} aria-hidden="true" />
              <span>+ Upload Resource</span>
            </Link>
            <Link
              href={`/doubts?subject_id=${subject.id}#ask`}
              className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
            >
              <DoubtIcon size={16} aria-hidden="true" />
              <span>+ Ask Doubt</span>
            </Link>
          </div>
        </div>

        <h1 className={styles.subjectTitle}>{subject.name}</h1>

        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{stats.total_resources}</span>
            <span className={styles.statLabel}>Shelf Materials</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{stats.total_doubts}</span>
            <span className={styles.statLabel}>Class Doubts</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{stats.solved_doubts}</span>
            <span className={styles.statLabel}>Solved Doubts</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{stats.helper_count}</span>
            <span className={styles.statLabel}>Peer Mentors</span>
          </div>
        </div>
      </section>

      {/* Syllabus Unit Checklist & Filter */}
      <section className={`card ${styles.unitsCard}`}>
        <div className={styles.unitsHeader}>
          <h2>unit syllabus shelf</h2>
          <span className={styles.unitsSubtitle}>
            Filter lecture notes & PYQs by semester unit
          </span>
        </div>

        <div className={styles.unitChipsRow}>
          <button
            type="button"
            className={`${styles.unitChip} ${
              selectedUnit === "all" ? styles.unitChipActive : ""
            }`}
            onClick={() => {
              setSelectedUnit("all");
              setActiveTab("shelf");
            }}
          >
            <span>All Units</span>
            <span className={styles.unitCountBadge}>{stats.total_resources}</span>
          </button>

          {unitKeys.map((u) => {
            const count = units[u] || 0;
            const isSelected = selectedUnit === u;
            return (
              <button
                key={u}
                type="button"
                className={`${styles.unitChip} ${
                  isSelected ? styles.unitChipActive : ""
                }`}
                onClick={() => {
                  setSelectedUnit(u);
                  setActiveTab("shelf");
                }}
              >
                <span>{u}</span>
                <span className={styles.unitCountBadge}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Tabs */}
      <nav className={styles.tabsBar} aria-label="Subject sections">
        <button
          type="button"
          className={`${styles.tabBtn} ${
            activeTab === "shelf" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setActiveTab("shelf")}
        >
          <DocIcon size={16} aria-hidden="true" />
          <span>Study Shelf</span>
          <span className={styles.tabCount}>{filteredResources.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${
            activeTab === "doubts" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setActiveTab("doubts")}
        >
          <DoubtIcon size={16} aria-hidden="true" />
          <span>Subject Doubts</span>
          <span className={styles.tabCount}>{doubts.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${
            activeTab === "mentors" ? styles.tabBtnActive : ""
          }`}
          onClick={() => setActiveTab("mentors")}
        >
          <PeopleIcon size={16} aria-hidden="true" />
          <span>Classmate Mentors</span>
          <span className={styles.tabCount}>{helpers.length}</span>
        </button>
      </nav>

      {/* Tab Panels */}
      <div className={styles.tabContent}>
        {/* TAB 1: STUDY SHELF */}
        {activeTab === "shelf" && (
          <div>
            {filteredResources.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No materials uploaded for this unit yet</h3>
                <p>
                  Be the first to share lecture slides, handwritten notes, or past questions!
                </p>
                <Link
                  href={`/resources?subject_id=${subject.id}#upload`}
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                >
                  <DocIcon size={16} aria-hidden="true" />
                  <span>Upload for this subject</span>
                </Link>
              </div>
            ) : (
              <div className={styles.shelfGrid}>
                {filteredResources.map((res) => (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    currentUserId={currentUserId}
                    isCr={isCr}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUBJECT DOUBTS */}
        {activeTab === "doubts" && (
          <div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className={`${styles.unitChip} ${
                    doubtFilter === "all" ? styles.unitChipActive : ""
                  }`}
                  onClick={() => setDoubtFilter("all")}
                >
                  All Questions ({doubts.length})
                </button>
                <button
                  type="button"
                  className={`${styles.unitChip} ${
                    doubtFilter === "open" ? styles.unitChipActive : ""
                  }`}
                  onClick={() => setDoubtFilter("open")}
                >
                  Open / Unsolved
                </button>
                <button
                  type="button"
                  className={`${styles.unitChip} ${
                    doubtFilter === "solved" ? styles.unitChipActive : ""
                  }`}
                  onClick={() => setDoubtFilter("solved")}
                >
                  Solved ({stats.solved_doubts})
                </button>
              </div>

              <Link
                href={`/doubts?subject_id=${subject.id}#ask`}
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              >
                + Ask Question
              </Link>
            </div>

            {filteredDoubts.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No doubts found in this subject</h3>
                <p>Have a question on concepts, assignments, or exam topics?</p>
                <Link
                  href={`/doubts?subject_id=${subject.id}#ask`}
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                >
                  <DoubtIcon size={16} aria-hidden="true" />
                  <span>Ask your classmates</span>
                </Link>
              </div>
            ) : (
              <div className={styles.doubtsList}>
                {filteredDoubts.map((d) => (
                  <Link
                    key={d.id}
                    href={`/doubts/${d.id}`}
                    className={styles.doubtCard}
                  >
                    <div className={styles.doubtHeader}>
                      <h3 className={styles.doubtTitle}>{d.title}</h3>
                      <span
                        className={`${styles.doubtStatus} ${
                          d.status === "solved"
                            ? styles.statusSolved
                            : d.status === "answered"
                            ? styles.statusAnswered
                            : styles.statusOpen
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>

                    <p className={styles.doubtBody}>{d.body}</p>

                    <div className={styles.doubtMeta}>
                      <span className={styles.doubtAuthor}>
                        Asked by {d.author_name}
                      </span>
                      <span className={styles.doubtAnswers}>
                        <MessageSquareIcon size={14} aria-hidden="true" />
                        <span>{d.answer_count} {d.answer_count === 1 ? "answer" : "answers"}</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLASSMATE MENTORS */}
        {activeTab === "mentors" && (
          <div>
            {helpers.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No peer mentors listed for this subject yet</h3>
                <p>
                  Good at this subject? Add it to your &quot;Can Help With&quot; list in settings!
                </p>
                <Link
                  href="/settings"
                  className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                >
                  <PeopleIcon size={16} aria-hidden="true" />
                  <span>Update My Helper Profile</span>
                </Link>
              </div>
            ) : (
              <div className={styles.mentorsGrid}>
                {helpers.map((m) => {
                  const initial = (m.display_name || "?").charAt(0).toUpperCase();
                  const helpTopics = [...m.can_help_with, ...m.skills];
                  return (
                    <div key={m.id} className={styles.mentorCard}>
                      <div>
                        <div className={styles.mentorTop}>
                          <div className={styles.mentorAvatar}>{initial}</div>
                          <div className={styles.mentorInfo}>
                            <h3 className={styles.mentorName}>{m.display_name}</h3>
                            <span className={styles.mentorRole}>
                              {m.role === "cr" ? "Class Representative" : "Classmate"}
                            </span>
                          </div>
                        </div>

                        {m.bio && <p className={styles.mentorBio}>&ldquo;{m.bio}&rdquo;</p>}

                        {helpTopics.length > 0 && (
                          <div className={styles.mentorTags}>
                            {helpTopics.slice(0, 5).map((t, idx) => (
                              <span key={idx} className={styles.mentorChip}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/people/${m.id}`}
                        className={styles.mentorAction}
                      >
                        View classmate profile &rarr;
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
