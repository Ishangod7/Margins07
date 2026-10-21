"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  apiFetch,
  type RevisionItem,
  type RevisionResponse,
} from "@/lib/api";
import {
  ZapIcon,
  DocIcon,
  CheckIcon,
  CrossIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import styles from "./revision.module.css";

const SUBJECTS = ["ALL", "DBMS", "ML", "CN", "OS", "WCD", "AM-IV"];

export default function RevisionClient({
  initialData,
}: {
  initialData: RevisionResponse;
}) {
  const router = useRouter();
  const [items, setItems] = useState<RevisionItem[]>(initialData.items);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("DBMS");
  const [formCategory, setFormCategory] = useState<"formula" | "pyq" | "one_pager">("formula");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formMarks, setFormMarks] = useState("5 Marks");
  const [formFreq, setFormFreq] = useState("High Frequency");
  const [submitting, setSubmitting] = useState(false);

  // Filter items
  const filtered = items.filter((item) => {
    if (selectedSubject !== "ALL" && item.subject_code !== selectedSubject) {
      return false;
    }
    if (activeCategory !== "all" && item.category !== activeCategory) {
      return false;
    }
    return true;
  });

  const formulaCount = items.filter((i) => i.category === "formula").length;
  const pyqCount = items.filter((i) => i.category === "pyq").length;
  const onePagerCount = items.filter((i) => i.category === "one_pager").length;

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) throw new Error("Please log in to share revision notes");

      const created = await apiFetch<RevisionItem>("/revision", token, {
        method: "POST",
        body: JSON.stringify({
          title: formTitle,
          subject_code: formSubject,
          category: formCategory,
          summary: formSummary,
          content: formContent,
          marks: formMarks,
          exam_frequency: formFreq,
          high_yield: true,
        }),
      });

      setItems((prev) => [created, ...prev]);
      setModalOpen(false);
      setFormTitle("");
      setFormSummary("");
      setFormContent("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to post revision item");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`${styles.container} ${focusMode ? styles.focusActive : ""}`}>
      {/* Header Banner */}
      <section className={`card ${styles.pageCover}`}>
        <div className={styles.coverText}>
          <h1>cram mode: exam fast-revision</h1>
          <p>
            Distraction-free high-yield formula sheets, repeated past questions &amp; 1-pager summary cheats
          </p>
        </div>
        <div className={styles.coverActions}>
          <button
            type="button"
            className={`${styles.focusToggleBtn} ${focusMode ? styles.focusToggleActive : ""}`}
            onClick={() => setFocusMode(!focusMode)}
          >
            <SparklesIcon size={16} aria-hidden="true" />
            <span>{focusMode ? "Exit Focus Mode" : "Dark Focus Mode"}</span>
          </button>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setModalOpen(true)}
          >
            <ZapIcon size={16} aria-hidden="true" />
            <span>+ Share Cheat Sheet</span>
          </button>
        </div>
      </section>

      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{items.length}</span>
          <span className={styles.statLabel}>Total High-Yield</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: "#2563eb" }}>
            {formulaCount}
          </span>
          <span className={styles.statLabel}>Formula Sheets</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: "#b45309" }}>
            {pyqCount}
          </span>
          <span className={styles.statLabel}>Top Solved PYQs</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: "#166534" }}>
            {onePagerCount}
          </span>
          <span className={styles.statLabel}>1-Pager Cheats</span>
        </div>
      </div>

      {/* Filter Section */}
      <section className={styles.filterCard}>
        <div className={styles.categoryTabs}>
          <button
            type="button"
            className={`${styles.catTab} ${
              activeCategory === "all" ? styles.catTabActive : ""
            }`}
            onClick={() => setActiveCategory("all")}
          >
            <span>All High-Yield</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>({items.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.catTab} ${
              activeCategory === "formula" ? styles.catTabActive : ""
            }`}
            onClick={() => setActiveCategory("formula")}
          >
            <span>Formulas &amp; Rules</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>({formulaCount})</span>
          </button>
          <button
            type="button"
            className={`${styles.catTab} ${
              activeCategory === "pyq" ? styles.catTabActive : ""
            }`}
            onClick={() => setActiveCategory("pyq")}
          >
            <span>Top Solved PYQs</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>({pyqCount})</span>
          </button>
          <button
            type="button"
            className={`${styles.catTab} ${
              activeCategory === "one_pager" ? styles.catTabActive : ""
            }`}
            onClick={() => setActiveCategory("one_pager")}
          >
            <span>1-Pager Cheatsheets</span>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>({onePagerCount})</span>
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

      {/* Cram Cards Grid */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No high-yield cards found for this subject</h3>
          <p>Be the first to share an exam formula, theorem, or solved question!</p>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setModalOpen(true)}
          >
            + Post High-Yield Card
          </button>
        </div>
      ) : (
        <div className={styles.cramGrid}>
          {filtered.map((item) => (
            <div key={item.id} className={styles.cramCard}>
              <div>
                <div className={styles.cardTop}>
                  <div className={styles.badgeGroup}>
                    <span className={styles.codePill}>{item.subject_code}</span>
                    <span className={styles.categoryPill}>
                      {item.category.replace("_", " ")}
                    </span>
                  </div>
                  <span className={styles.marksPill}>{item.marks}</span>
                </div>

                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardSummary}>{item.summary}</p>

                <div className={styles.formulaBox}>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => handleCopy(item.id, item.content)}
                  >
                    {copiedId === item.id ? "Copied!" : "Copy"}
                  </button>
                  {item.content}
                </div>
              </div>

              <div className={styles.cardMeta}>
                <span className={styles.freqTag}>{item.exam_frequency}</span>
                {item.resource_link ? (
                  <Link
                    href={item.resource_link}
                    style={{ color: "var(--blue-dark, #0369a1)", fontWeight: "bold", textDecoration: "underline" }}
                  >
                    Download File &rarr;
                  </Link>
                ) : (
                  <span>By {item.author_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className={styles.modalContent}>
            <div className={styles.modalHead}>
              <h2>share high-yield cheat card</h2>
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
                <label>Card Title *</label>
                <input
                  required
                  placeholder="e.g. Normal Distribution Z-Score Formula"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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
                    <option value="GEN">General</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className={styles.formSelect}
                  >
                    <option value="formula">Formula Sheet</option>
                    <option value="pyq">Top Solved PYQ</option>
                    <option value="one_pager">1-Pager Cheatsheet</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className={styles.formGroup}>
                  <label>Marks Weightage</label>
                  <input
                    placeholder="e.g. 5 Marks, 10 Marks"
                    value={formMarks}
                    onChange={(e) => setFormMarks(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Exam Frequency</label>
                  <input
                    placeholder="e.g. Repeated 3x in Univ papers"
                    value={formFreq}
                    onChange={(e) => setFormFreq(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Summary / Quick Description *</label>
                <input
                  required
                  placeholder="e.g. Must-know equations for mid-sem question 2"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Formulas / Code / Solution Text *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste formula equations, derivations, or solved points..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className={styles.formTextarea}
                />
              </div>

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
                  {submitting ? "Posting..." : "Post to Cram Shelf"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
