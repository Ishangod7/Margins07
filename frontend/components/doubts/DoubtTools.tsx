"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, type Doubt, type Answer, type Subject } from "@/lib/api";
import { CheckIcon, ThumbsUpIcon, MessageSquareIcon } from "@/components/ui/Icons";
import styles from "@/app/doubts/doubts.module.css";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DoubtCard({ doubt, token }: { doubt: Doubt; token: string }) {
  const router = useRouter();
  const [followed, setFollowed] = useState(doubt.is_followed);
  const [followCount, setFollowCount] = useState(doubt.follow_count);
  const [loadingFollow, setLoadingFollow] = useState(false);

  async function handleToggleFollow() {
    if (loadingFollow) return;
    setLoadingFollow(true);
    try {
      const res = await apiFetch<{ followed: boolean }>(`/doubts/${doubt.id}/follow`, token, {
        method: "POST",
      });
      setFollowed(res.followed);
      setFollowCount((prev) => (res.followed ? prev + 1 : Math.max(0, prev - 1)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFollow(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this doubt?")) return;
    try {
      await apiFetch(`/doubts/${doubt.id}`, token, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert("Could not delete doubt.");
    }
  }

  const statusLabel =
    doubt.status === "solved" ? "SOLVED" : doubt.status === "answered" ? "ANSWERED" : "OPEN";

  const statusClass =
    doubt.status === "solved"
      ? styles.statusSolved
      : doubt.status === "answered"
      ? styles.statusAnswered
      : styles.statusOpen;

  return (
    <article className={styles.doubtCard}>
      <div className={styles.cardHeader}>
        <div className={styles.badges}>
          <span className={`${styles.statusBadge} ${statusClass}`}>{statusLabel}</span>
          {doubt.subject && <span className={styles.subjectBadge}>{doubt.subject.name}</span>}
        </div>
        <span className={styles.cardTime}>{timeAgo(doubt.created_at)}</span>
      </div>

      <Link href={`/doubts/${doubt.id}`} className={styles.doubtTitle}>
        {doubt.title}
      </Link>

      <p className={styles.doubtSnippet}>{doubt.body}</p>

      {doubt.tags && doubt.tags.length > 0 && (
        <div className={styles.tagRow}>
          {doubt.tags.map((t, idx) => (
            <span key={idx} className={styles.tag}>
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <span>
            asked by <strong className={styles.asker}>{doubt.author_name}</strong>
          </span>
          <button
            type="button"
            className={styles.followBtn}
            onClick={handleToggleFollow}
            disabled={loadingFollow}
            title={followed ? "Following this doubt" : "Follow this doubt"}
          >
            <span>{followed ? "Following" : "Follow"}</span>
            <span>({followCount})</span>
          </button>
        </div>

        <div className={styles.footerRight}>
          <Link href={`/doubts/${doubt.id}`} className={styles.ansCount}>
            <MessageSquareIcon size={14} />
            <span>
              {doubt.answer_count} {doubt.answer_count === 1 ? "answer" : "answers"}
            </span>
          </Link>

          {doubt.is_mine && (
            <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
              delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function DoubtComposer({ subjects, token }: { subjects: Subject[]; token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await apiFetch("/doubts", token, {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          subject_id: subjectId || null,
          tags,
        }),
      });
      setTitle("");
      setBody("");
      setSubjectId("");
      setTagsInput("");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to post doubt.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={styles.askBtn} onClick={() => setOpen(true)}>
        + Ask a Doubt
      </button>
    );
  }

  return (
    <section className={styles.composerCard}>
      <h2 className={styles.composerTitle}>ask a class doubt</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Subject (optional)</label>
          <select
            className={styles.inputField}
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">General / Any Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>What is your question or doubt?</label>
          <input
            className={styles.inputField}
            placeholder="e.g. How does backpropagation compute gradients in CNNs?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
            maxLength={200}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Details & code snippets</label>
          <textarea
            className={`${styles.inputField} ${styles.textareaField}`}
            placeholder="Provide context, formulas, code snippets, or what you tried..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={5}
            maxLength={5000}
          />
          <span className={styles.codeHint}>Tip: You can paste code or error logs directly.</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Tags (comma-separated, max 5)</label>
          <input
            className={styles.inputField}
            placeholder="e.g. unit-1, assignment-2, pytorch"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        {error && <p className={styles.error} style={{ color: "#d85e55", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <button type="submit" className={styles.askBtn} disabled={submitting}>
            {submitting ? "Posting..." : "Post Question →"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setOpen(false)}
            style={{ padding: "8px 14px", background: "#f1ebd8", border: "1.5px solid #282722" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export function AnswerCard({
  answer,
  doubtAuthorId,
  currentUserId,
  token,
}: {
  answer: Answer;
  doubtAuthorId: string;
  currentUserId: string;
  token: string;
}) {
  const router = useRouter();
  const [voted, setVoted] = useState(answer.has_voted);
  const [helpfulCount, setHelpfulCount] = useState(answer.helpful_count);
  const [isAccepted, setIsAccepted] = useState(answer.is_accepted);
  const [loading, setLoading] = useState(false);

  const isDoubtAsker = currentUserId === doubtAuthorId;

  async function handleVote() {
    if (answer.is_mine) {
      alert("You cannot upvote your own answer.");
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ voted: boolean }>(`/answers/${answer.id}/vote`, token, {
        method: "POST",
      });
      setVoted(res.voted);
      setHelpfulCount((prev) => (res.voted ? prev + 1 : Math.max(0, prev - 1)));
    } catch (e: any) {
      alert(e?.message || "Failed to vote");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAccept() {
    if (!isDoubtAsker) return;
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ is_accepted: boolean }>(`/answers/${answer.id}/accept`, token, {
        method: "POST",
      });
      setIsAccepted(res.is_accepted);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Failed to update answer acceptance");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this answer?")) return;
    try {
      await apiFetch(`/answers/${answer.id}`, token, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert("Could not delete answer");
    }
  }

  return (
    <div
      className={styles.answerCard}
      style={isAccepted ? { borderColor: "#2e5927", background: "rgba(207, 224, 200, 0.25)" } : {}}
    >
      {isAccepted && (
        <div className={styles.acceptedBanner}>
          <CheckIcon size={14} />
          <span>ACCEPTED SOLUTION</span>
        </div>
      )}

      <div className={styles.answerBody}>{answer.body}</div>

      <div className={styles.answerFooter}>
        <div>
          answered by <strong>{answer.author_name}</strong> • {timeAgo(answer.created_at)}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className={`${styles.voteButton} ${voted ? styles.voteActive : ""}`}
            onClick={handleVote}
            disabled={loading || answer.is_mine}
            title={answer.is_mine ? "Cannot vote on own answer" : "Helpful answer"}
          >
            <ThumbsUpIcon size={14} />
            <span>Helpful ({helpfulCount})</span>
          </button>

          {isDoubtAsker && (
            <button
              type="button"
              className={styles.acceptButton}
              onClick={handleToggleAccept}
              disabled={loading}
            >
              {isAccepted ? "Unmark Solution" : "Mark as Solution"}
            </button>
          )}

          {answer.is_mine && (
            <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
              delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnswerComposer({ doubtId, token }: { doubtId: string; token: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/doubts/${doubtId}/answers`, token, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setBody("");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Could not post answer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.composerCard} style={{ marginTop: "24px" }}>
      <h3 className={styles.composerTitle} style={{ fontSize: "24px" }}>
        know the answer? help your classmate!
      </h3>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <textarea
            className={`${styles.inputField} ${styles.textareaField}`}
            placeholder="Type your explanation, formula, or code solution..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            minLength={3}
            maxLength={5000}
          />
        </div>
        {error && <p style={{ color: "#d85e55", fontSize: 13 }}>{error}</p>}
        <button type="submit" className={styles.askBtn} disabled={submitting}>
          {submitting ? "Posting..." : "Submit Answer →"}
        </button>
      </form>
    </div>
  );
}
