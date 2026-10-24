"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  apiFetch,
  type DeadlineItem,
  type DeadlinesResponse,
} from "@/lib/api";
import {
  ClockIcon,
  CheckIcon,
  CalendarIcon,
  CrossIcon,
  DocIcon,
  CopyIcon,
  SearchIcon,
  BookOpenIcon,
  NoticeIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import styles from "./deadlines.module.css";

const SUBJECTS = ["ALL", "MATHS-I", "PHY", "BEE", "EGD", "EGPC", "AAD-I", "WMP-I", "ACAD"];

type StatusFilter = "active" | "urgent" | "completed" | "all";

export default function DeadlinesClient({
  initialData,
  isCr,
}: {
  initialData: DeadlinesResponse;
  isCr?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>(initialData.deadlines);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("MATHS-I");
  const [formDueAt, setFormDueAt] = useState("");
  const [formType, setFormType] = useState("assignment");
  const [formMode, setFormMode] = useState("Classroom Submission");
  const [formDesc, setFormDesc] = useState("");
  const [formIsOfficial, setFormIsOfficial] = useState(false);

  // Filter deadlines by search, subject, and status
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return deadlines.filter((d) => {
      // Subject filter
      if (selectedSubject !== "ALL" && d.subject_code !== selectedSubject) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && d.completed) return false;
      if (
        statusFilter === "urgent" &&
        (d.completed || (d.urgency !== "urgent" && d.urgency !== "overdue"))
      )
        return false;
      if (statusFilter === "completed" && !d.completed) return false;

      // Search keyword filter
      if (q) {
        const matchesQ =
          d.title.toLowerCase().includes(q) ||
          d.subject_code.toLowerCase().includes(q) ||
          (d.submission_mode && d.submission_mode.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }

      return true;
    });
  }, [deadlines, selectedSubject, statusFilter, searchQuery]);

  // Dynamic counts
  const pendingCount = deadlines.filter((d) => !d.completed).length;
  const completedCount = deadlines.filter((d) => d.completed).length;
  const urgentCount = deadlines.filter(
    (d) => !d.completed && (d.urgency === "urgent" || d.urgency === "overdue")
  ).length;
  const nextImminent = deadlines.find((d) => !d.completed && d.urgency !== "overdue");

  async function handleToggle(id: string) {
    const target = deadlines.find((d) => d.id === id);
    if (!target) return;

    const willBeCompleted = !target.completed;

    // Optimistic UI update
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, completed: willBeCompleted } : d))
    );

    if (willBeCompleted) {
      toast.success(`Completed "${target.title}"!`, "Submission Tracked");
    } else {
      toast.info(`Moved "${target.title}" back to pending desk.`, "Task Restored");
    }

    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) return;

      await apiFetch<{ id: string; completed: boolean }>(
        `/deadlines/${id}/toggle`,
        token,
        { method: "POST" }
      );
    } catch {
      // Revert if error
      setDeadlines((prev) =>
        prev.map((d) => (d.id === id ? { ...d, completed: !willBeCompleted } : d))
      );
      toast.error("Could not update submission state. Please try again.");
    }
  }

  function handleCopySubmission(d: DeadlineItem) {
    const textToCopy = `[Assignment Deadline - ${d.subject_code}]\n${d.title}\nDue Date: ${formatDueDate(
      d.due_at
    )}\nSubmission Mode: ${d.submission_mode}\n${
      d.description ? `Instructions: ${d.description}\n` : ""
    }— Margins AI&DS Division A`;

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopiedId(d.id);
        toast.success(`Copied submission info for "${d.title}"!`, "Copied");
        setTimeout(() => setCopiedId(null), 2500);
      })
      .catch(() => {
        toast.error("Could not copy to clipboard.");
      });
  }

  async function handleDeleteDeadline(id: string, title: string) {
    if (!confirm(`Remove "${title}" from deadlines desk?`)) return;

    setDeadlines((prev) => prev.filter((d) => d.id !== id));
    toast.info(`Removed "${title}" from deadlines.`, "Task Deleted");

    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) return;

      await apiFetch(`/deadlines/${id}`, token, { method: "DELETE" });
    } catch {
      // Fail silently or keep optimistic
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formDueAt) return;

    setSubmitting(true);
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) throw new Error("Please log in");

      const created = await apiFetch<DeadlineItem>("/deadlines", token, {
        method: "POST",
        body: JSON.stringify({
          title: formTitle.trim(),
          subject_code: formSubject,
          due_at: new Date(formDueAt).toISOString(),
          type: formType,
          submission_mode: formMode,
          description: formDesc.trim(),
          is_official: formIsOfficial,
        }),
      });

      setDeadlines((prev) => [created, ...prev]);
      setModalOpen(false);
      setFormTitle("");
      setFormDesc("");
      toast.success(`Deadline "${created.title}" added to submission desk!`, "Task Created");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save deadline");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDueDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <section className={`card ${styles.pageCover}`}>
        <div className={styles.coverText}>
          <h1>assignment &amp; deadline desk</h1>
          <p>
            Track Division A lab journals, mini-projects, assignments &amp; internal assessment submissions
          </p>
        </div>
        <div className={styles.coverActions}>
          <Link href="/notices" className="btn small">
            <NoticeIcon size={15} aria-hidden="true" />
            <span>Notice Board</span>
          </Link>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setModalOpen(true)}
          >
            <PlusIcon size={16} aria-hidden="true" />
            <span>{isCr ? "Post Class Deadline" : "Add Personal Task"}</span>
          </button>
        </div>
      </section>

      {/* Urgent Next Imminent Deadline Hero Banner */}
      {nextImminent && (
        <section className={styles.urgentHero}>
          <div className={styles.urgentLeft}>
            <div className={styles.clockIconWrap} aria-hidden="true">
              <ClockIcon size={24} />
            </div>
            <div className={styles.urgentContent}>
              <div className={styles.urgentLabel}>Next Imminent Deadline</div>
              <h2 className={styles.urgentTitle}>{nextImminent.title}</h2>
              <div className={styles.urgentMeta}>
                <span className={styles.urgentTag}>{nextImminent.subject_code}</span>
                <span>Due {formatDueDate(nextImminent.due_at)}</span>
                <span className={styles.urgentMode}>{nextImminent.submission_mode}</span>
              </div>
            </div>
          </div>
          <div className={styles.urgentRight}>
            <div className={styles.countdownPill}>
              <ClockIcon size={18} aria-hidden="true" />
              <span>{nextImminent.time_remaining}</span>
            </div>
            <button
              type="button"
              className="btn small"
              onClick={() => handleToggle(nextImminent.id)}
            >
              Mark As Done
            </button>
          </div>
        </section>
      )}

      {/* Stats Counter Bar */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{pendingCount}</span>
          <span className={styles.statLabel}>Pending Tasks</span>
        </div>
        <div className={styles.statCard}>
          <span
            className={styles.statVal}
            style={{ color: urgentCount > 0 ? "#b91c1c" : "inherit" }}
          >
            {urgentCount}
          </span>
          <span className={styles.statLabel}>Due Next 48h</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal} style={{ color: "#166534" }}>
            {completedCount}
          </span>
          <span className={styles.statLabel}>Completed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{deadlines.length}</span>
          <span className={styles.statLabel}>Total On Deck</span>
        </div>
      </div>

      {/* Filter and Search Section */}
      <section className={styles.filterSection}>
        {/* Search bar */}
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <SearchIcon size={17} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments by title, submission portal, or keywords..."
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={styles.clearSearchBtn}
                aria-label="Clear search query"
              >
                <CrossIcon size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className={styles.statusTabs}>
          <button
            type="button"
            className={`${styles.statusTab} ${
              statusFilter === "active" ? styles.statusTabActive : ""
            }`}
            onClick={() => setStatusFilter("active")}
          >
            <span>Pending</span>
            <span className={styles.tabBadge}>{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.statusTab} ${
              statusFilter === "urgent" ? styles.statusTabActive : ""
            }`}
            onClick={() => setStatusFilter("urgent")}
          >
            <span>Urgent &amp; Overdue</span>
            <span className={styles.tabBadge}>{urgentCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.statusTab} ${
              statusFilter === "completed" ? styles.statusTabActive : ""
            }`}
            onClick={() => setStatusFilter("completed")}
          >
            <span>Completed</span>
            <span className={styles.tabBadge}>{completedCount}</span>
          </button>
          <button
            type="button"
            className={`${styles.statusTab} ${
              statusFilter === "all" ? styles.statusTabActive : ""
            }`}
            onClick={() => setStatusFilter("all")}
          >
            <span>All Submissions</span>
            <span className={styles.tabBadge}>{deadlines.length}</span>
          </button>
        </div>

        {/* Subject Chips */}
        <div className={styles.subjectFilterRow}>
          <span className={styles.filterLabel}>Subject:</span>
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.subjectChip} ${
                selectedSubject === s ? styles.subjectChipActive : ""
              }`}
              onClick={() => setSelectedSubject(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Deadlines List */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <DocIcon size={36} className={styles.emptyIcon} aria-hidden="true" />
          <h2 className={styles.emptyTitle}>
            {searchQuery
              ? `No deadlines matching "${searchQuery}"`
              : "All clear! No deadlines matching this filter"}
          </h2>
          <p className={styles.emptyText}>
            {searchQuery
              ? "Try searching for a different keyword or reset your subject filter."
              : "You have no pending assignments or journals in this view."}
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            {searchQuery && (
              <button
                type="button"
                className="btn small"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </button>
            )}
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => setModalOpen(true)}
            >
              + Add New Deadline
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.deadlinesList}>
          {filtered.map((d) => (
            <article
              key={d.id}
              className={`card ${styles.deadlineCard} ${
                d.completed ? styles.cardCompleted : ""
              }`}
            >
              <div className={styles.deadlineTop}>
                <div className={styles.checkTitleArea}>
                  <button
                    type="button"
                    className={`${styles.checkboxBtn} ${
                      d.completed ? styles.checkboxChecked : ""
                    }`}
                    onClick={() => handleToggle(d.id)}
                    aria-label={d.completed ? "Mark pending" : "Mark completed"}
                  >
                    {d.completed && <CheckIcon size={16} aria-hidden="true" />}
                  </button>

                  <div className={styles.deadlineMain}>
                    <div className={styles.deadlineBadges}>
                      <span className={styles.codePill}>{d.subject_code}</span>
                      <span className={styles.typePill}>
                        {d.type.replace("_", " ")}
                      </span>
                      {d.is_official ? (
                        <span className={styles.officialBadge}>CR Announcement</span>
                      ) : (
                        <span className={styles.personalBadge}>Personal Task</span>
                      )}
                    </div>

                    <h2
                      className={`${styles.cardTitle} ${
                        d.completed ? styles.titleCompleted : ""
                      }`}
                    >
                      {d.title}
                    </h2>

                    {d.description && (
                      <p className={styles.cardDescription}>{d.description}</p>
                    )}
                  </div>
                </div>

                <div
                  className={`${styles.timePill} ${
                    d.completed
                      ? styles.timeNormal
                      : d.urgency === "urgent"
                      ? styles.timeUrgent
                      : d.urgency === "overdue"
                      ? styles.timeOverdue
                      : d.urgency === "soon"
                      ? styles.timeSoon
                      : styles.timeNormal
                  }`}
                >
                  {d.completed ? "Completed" : d.time_remaining}
                </div>
              </div>

              <div className={styles.deadlineFooter}>
                <div className={styles.footerLeft}>
                  <span className={styles.submissionMode}>
                    <DocIcon size={14} aria-hidden="true" />
                    <span>{d.submission_mode}</span>
                  </span>
                  <span className={styles.dueDateText}>Due: {formatDueDate(d.due_at)}</span>
                </div>

                <div className={styles.cardActionGroup}>
                  <button
                    type="button"
                    onClick={() => handleCopySubmission(d)}
                    className={styles.miniActionBtn}
                    title="Copy submission details"
                  >
                    {copiedId === d.id ? (
                      <>
                        <CheckIcon size={13} aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={13} aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {d.subject_code && d.subject_code !== "GEN" && (
                    <Link
                      href={`/subjects?q=${encodeURIComponent(d.subject_code)}`}
                      className={styles.miniActionBtn}
                      title="Open Subject Hub"
                    >
                      <BookOpenIcon size={13} aria-hidden="true" />
                      <span>Hub</span>
                    </Link>
                  )}

                  {d.id.startsWith("custom-") && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDeadline(d.id, d.title)}
                      className={`${styles.miniActionBtn} ${styles.deleteActionBtn}`}
                      title="Delete task"
                    >
                      <CrossIcon size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add Deadline / Personal Task Modal */}
      {modalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className={`card ${styles.modalContent}`}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>
                {isCr ? "post class deadline" : "add personal task"}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <CrossIcon size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreate} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Task / Assignment Title *</label>
                <input
                  required
                  placeholder="e.g. Physics Lab Journal Exp 2 &amp; 3"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Subject</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className={styles.formSelect}
                  >
                    <option value="MATHS-I">Mathematics-I</option>
                    <option value="PHY">Physics</option>
                    <option value="BEE">Basic Electrical Engineering</option>
                    <option value="EGD">Engineering Graphics &amp; Design</option>
                    <option value="EGPC">EGPC</option>
                    <option value="AAD-I">Attitude &amp; Aptitude Dev I</option>
                    <option value="WMP-I">Workshop Practice I</option>
                    <option value="ACAD">Academic Sessions</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Submission Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className={styles.formSelect}
                  >
                    <option value="lab_journal">Lab Journal</option>
                    <option value="assignment">Assignment</option>
                    <option value="mini_project">Mini Project</option>
                    <option value="presentation">Presentation</option>
                    <option value="exam_submission">Exam Submission</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Due Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formDueAt}
                  onChange={(e) => setFormDueAt(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Submission Mode / Location</label>
                <input
                  placeholder="e.g. Physical Lab 402, Google Classroom, Moodle"
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes &amp; Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Deliverables checklist, batch details, or special instructions..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className={styles.formTextarea}
                />
              </div>

              {isCr && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0" }}>
                  <input
                    type="checkbox"
                    id="crOfficialCheck"
                    checked={formIsOfficial}
                    onChange={(e) => setFormIsOfficial(e.target.checked)}
                  />
                  <label htmlFor="crOfficialCheck" style={{ cursor: "pointer", fontSize: "14px" }}>
                    Broadcast to entire class as an official CR announcement
                  </label>
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn yellow"
                >
                  {submitting ? "Saving..." : "Save Deadline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
