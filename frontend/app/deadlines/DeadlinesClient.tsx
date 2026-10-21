"use client";

import { useState } from "react";
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
} from "@/components/ui/Icons";
import styles from "./deadlines.module.css";

const SUBJECTS = ["ALL", "DBMS", "ML", "CN", "OS", "WCD", "AM-IV", "GEN"];

type StatusFilter = "active" | "urgent" | "completed" | "all";

export default function DeadlinesClient({
  initialData,
  isCr,
}: {
  initialData: DeadlinesResponse;
  isCr?: boolean;
}) {
  const router = useRouter();
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>(initialData.deadlines);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("GEN");
  const [formDueAt, setFormDueAt] = useState("");
  const [formType, setFormType] = useState("assignment");
  const [formMode, setFormMode] = useState("Classroom Submission");
  const [formDesc, setFormDesc] = useState("");
  const [formIsOfficial, setFormIsOfficial] = useState(false);

  // Filter deadlines
  const filtered = deadlines.filter((d) => {
    // Subject filter
    if (selectedSubject !== "ALL" && d.subject_code !== selectedSubject) {
      return false;
    }
    // Status filter
    if (statusFilter === "active") return !d.completed;
    if (statusFilter === "urgent") return !d.completed && (d.urgency === "urgent" || d.urgency === "overdue");
    if (statusFilter === "completed") return d.completed;
    return true;
  });

  // Dynamic counts
  const pendingCount = deadlines.filter((d) => !d.completed).length;
  const completedCount = deadlines.filter((d) => d.completed).length;
  const urgentCount = deadlines.filter((d) => !d.completed && (d.urgency === "urgent" || d.urgency === "overdue")).length;
  const nextImminent = deadlines.find((d) => !d.completed && d.urgency !== "overdue");

  async function handleToggle(id: string) {
    // Optimistic UI update
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d))
    );

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
        prev.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d))
      );
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
          title: formTitle,
          subject_code: formSubject,
          due_at: new Date(formDueAt).toISOString(),
          type: formType,
          submission_mode: formMode,
          description: formDesc,
          is_official: formIsOfficial,
        }),
      });

      setDeadlines((prev) => [created, ...prev]);
      setModalOpen(false);
      setFormTitle("");
      setFormDesc("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to save deadline");
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
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setModalOpen(true)}
          >
            <CalendarIcon size={16} aria-hidden="true" />
            <span>{isCr ? "+ Post Class Deadline" : "+ Add Personal Task"}</span>
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
          <span className={styles.statVal} style={{ color: urgentCount > 0 ? "#b91c1c" : "inherit" }}>
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

      {/* Filter Section */}
      <section className={styles.filterSection}>
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
          <h3>All clear! No deadlines matching this filter</h3>
          <p>You have no pending assignments or journals in this view.</p>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setModalOpen(true)}
          >
            + Add New Deadline
          </button>
        </div>
      ) : (
        <div className={styles.deadlinesList}>
          {filtered.map((d) => (
            <div
              key={d.id}
              className={`${styles.deadlineCard} ${
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
                      {d.is_official && (
                        <span className={styles.officialBadge}>CR Announcement</span>
                      )}
                    </div>

                    <h3
                      className={`${styles.cardTitle} ${
                        d.completed ? styles.titleCompleted : ""
                      }`}
                    >
                      {d.title}
                    </h3>

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
                <span className={styles.submissionMode}>
                  <DocIcon size={14} aria-hidden="true" />
                  <span>{d.submission_mode}</span>
                </span>
                <span>Due: {formatDueDate(d.due_at)}</span>
              </div>
            </div>
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
          <div className={styles.modalContent}>
            <div className={styles.modalHead}>
              <h2>{isCr ? "post class deadline" : "add personal task"}</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <CrossIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label>Task / Assignment Title *</label>
                <input
                  required
                  placeholder="e.g. DBMS Lab Journal Exp 7 & 8"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className={styles.formGroup}>
                  <label>Subject</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className={styles.formSelect}
                  >
                    <option value="DBMS">DBMS</option>
                    <option value="ML">Machine Learning</option>
                    <option value="CN">Computer Networks</option>
                    <option value="OS">Operating Systems</option>
                    <option value="WCD">Web &amp; Cloud Dev</option>
                    <option value="AM-IV">Applied Maths IV</option>
                    <option value="GEN">General / Exam</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Submission Type</label>
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
                <label>Due Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formDueAt}
                  onChange={(e) => setFormDueAt(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Submission Mode / Location</label>
                <input
                  placeholder="e.g. Physical Lab 402, Google Classroom, Moodle"
                  value={formMode}
                  onChange={(e) => setFormMode(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Notes &amp; Instructions</label>
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
