"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type Notice } from "@/lib/api";
import {
  DocIcon,
  PinIcon,
  SearchIcon,
  CrossIcon,
  CopyIcon,
  CheckIcon,
  UserIcon,
  ClockIcon,
  NoticeIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import styles from "@/app/notices/notices.module.css";

export const NOTICE_CATEGORIES = [
  "All",
  "Important",
  "Exam",
  "Deadline",
  "Assignment",
  "Academic",
  "General",
] as const;

export type NoticeCategory = typeof NOTICE_CATEGORIES[number];

async function getAccessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getDateGroup(iso: string): "Today" | "Yesterday" | "This Week" | "Earlier" {
  const target = new Date(iso);
  const now = new Date();
  
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffDays = Math.round((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  return "Earlier";
}

// Notice Composer for Class Representatives
export function NoticeComposer({ onCreated }: { onCreated?: (notice: Notice) => void }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Important");
  const [isPinned, setIsPinned] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || busy) return;

    setBusy(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const newNotice = await apiFetch<Notice>("/notices", token, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          is_pinned: isPinned,
        }),
      });

      setTitle("");
      setContent("");
      setIsPinned(false);
      setIsOpen(false);
      if (onCreated) {
        onCreated(newNotice);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to post notice.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.composerWrapper}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`btn yellow ${styles.composerToggleBtn}`}
      >
        <PlusIcon size={16} aria-hidden="true" />
        <span>{isOpen ? "Close Composer" : "Post New Class Notice"}</span>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className={`card ${styles.composerForm}`}>
          <div className={styles.composerHeader}>
            <div className={styles.composerTitle}>
              <NoticeIcon size={18} aria-hidden="true" />
              <span>Broadcast Announcement to Division A</span>
            </div>
            <span className={styles.crBadge}>CR Action</span>
          </div>

          <div className={styles.formRow}>
            <label className={styles.fieldLabel} htmlFor="notice-title">
              Notice Title
            </label>
            <input
              id="notice-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Submissions for Physics Lab Journal Exp 2 &amp; 3"
              required
              maxLength={150}
              disabled={busy}
            />
          </div>

          <div className={styles.formGridTwo}>
            <div className={styles.formRow}>
              <label className={styles.fieldLabel} htmlFor="notice-category">
                Notice Category
              </label>
              <select
                id="notice-category"
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={busy}
              >
                {NOTICE_CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  disabled={busy}
                />
                <span>Pin this notice to top of board</span>
              </label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.labelWithCounter}>
              <label className={styles.fieldLabel} htmlFor="notice-content">
                Announcement Content
              </label>
              <span className={styles.counter}>{content.length} / 5000</span>
            </div>
            <textarea
              id="notice-content"
              className="textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide all relevant details: venue, deadlines, instructions, and links..."
              rows={5}
              required
              maxLength={5000}
              disabled={busy}
            />
          </div>

          {error && <p className={styles.dangerAlert}>{error}</p>}

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={busy || !title.trim() || !content.trim()}
            >
              <NoticeIcon size={15} aria-hidden="true" />
              <span>{busy ? "Broadcasting..." : "Publish Notice"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Notice Item Card
export function NoticeCard({
  notice,
  isCr,
  onTogglePin,
  onDelete,
}: {
  notice: Notice;
  isCr: boolean;
  onTogglePin?: (id: string, currentPinned: boolean) => void;
  onDelete?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  function handleCopyNotice() {
    const textToCopy = `[TCET AI&DS Notice - ${notice.category.toUpperCase()}]\n${notice.title}\n\n${notice.content}\n\nPosted by: ${
      notice.author_name || "Class Representative"
    }\n— Margins Campus Desk`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback
    });
  }

  const categoryLower = notice.category.toLowerCase();
  const isImportant = categoryLower === "important" || categoryLower === "exam";
  const isDeadline = categoryLower === "deadline" || categoryLower === "assignment";

  return (
    <article
      className={`card ${styles.noticeCard} ${
        notice.is_pinned ? styles.noticeCardPinned : ""
      } ${isImportant ? styles.noticeCardImportant : ""}`}
    >
      <div className={styles.cardHeaderRow}>
        <div className={styles.badgeRow}>
          <span
            className={`${styles.categoryPill} ${
              isImportant
                ? styles.categoryImportant
                : isDeadline
                ? styles.categoryDeadline
                : styles.categoryDefault
            }`}
          >
            {notice.category.toUpperCase()}
          </span>

          {notice.is_pinned && (
            <span className={styles.pinnedPill}>
              <PinIcon size={12} aria-hidden="true" />
              <span>PINNED</span>
            </span>
          )}
        </div>

        <div className={styles.timeMeta}>
          <ClockIcon size={14} aria-hidden="true" />
          <span>{timeAgo(notice.created_at)}</span>
        </div>
      </div>

      <h2 className={styles.noticeTitle}>{notice.title}</h2>

      <div className={styles.noticeBody}>{notice.content}</div>

      <div className={styles.cardFooterRow}>
        <div className={styles.authorMeta}>
          <UserIcon size={15} aria-hidden="true" />
          <span>{notice.author_name || "Class Representative"}</span>
        </div>

        <div className={styles.cardButtonActions}>
          <button
            type="button"
            onClick={handleCopyNotice}
            className={styles.copyBtn}
            title="Copy notice text formatted for WhatsApp or study groups"
          >
            {copied ? (
              <>
                <CheckIcon size={14} className={styles.checkIcon} aria-hidden="true" />
                <span className={styles.copiedText}>Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon size={14} aria-hidden="true" />
                <span>Copy Notice</span>
              </>
            )}
          </button>

          {isCr && (
            <>
              <button
                type="button"
                disabled={isProcessing}
                onClick={async () => {
                  if (onTogglePin) {
                    setIsProcessing(true);
                    await onTogglePin(notice.id, notice.is_pinned);
                    setIsProcessing(false);
                  }
                }}
                className={styles.crActionBtn}
              >
                <PinIcon size={13} aria-hidden="true" />
                <span>{notice.is_pinned ? "Unpin" : "Pin"}</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={async () => {
                  if (confirm("Delete this notice from class board?")) {
                    if (onDelete) {
                      setIsProcessing(true);
                      await onDelete(notice.id);
                      setIsProcessing(false);
                    }
                  }
                }}
                className={`${styles.crActionBtn} ${styles.deleteBtn}`}
              >
                <CrossIcon size={13} aria-hidden="true" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// Notice Board Client with Categories, Search, and Timeline Grouping
export function NoticeBoardClient({
  initialNotices,
  isCr,
}: {
  initialNotices: Notice[];
  isCr: boolean;
}) {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [selectedCategory, setSelectedCategory] = useState<NoticeCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");

  async function handleTogglePin(id: string, currentPinned: boolean) {
    try {
      const token = await getAccessToken();
      const updated = await apiFetch<Notice>(`/notices/${id}/pin`, token, {
        method: "PATCH",
      });
      setNotices((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_pinned: updated.is_pinned } : n))
      );
      router.refresh();
    } catch {
      // Keep state on failure
    }
  }

  async function handleDelete(id: string) {
    try {
      const token = await getAccessToken();
      await apiFetch(`/notices/${id}`, token, { method: "DELETE" });
      setNotices((prev) => prev.filter((n) => n.id !== id));
      router.refresh();
    } catch {
      // Keep state on failure
    }
  }

  function handleNoticeCreated(newNotice: Notice) {
    setNotices((prev) => [newNotice, ...prev]);
  }

  // Filter notices by category and search term
  const filteredNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notices.filter((n) => {
      const matchesCategory =
        selectedCategory === "All" ||
        n.category.toLowerCase() === selectedCategory.toLowerCase();

      if (!matchesCategory) return false;

      if (!q) return true;

      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        (n.author_name && n.author_name.toLowerCase().includes(q))
      );
    });
  }, [notices, selectedCategory, searchQuery]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: notices.length };
    NOTICE_CATEGORIES.forEach((cat) => {
      if (cat !== "All") {
        counts[cat] = notices.filter(
          (n) => n.category.toLowerCase() === cat.toLowerCase()
        ).length;
      }
    });
    return counts;
  }, [notices]);

  // Split into pinned and chronological timeline
  const pinnedNotices = useMemo(() => {
    return filteredNotices.filter((n) => n.is_pinned);
  }, [filteredNotices]);

  const regularNotices = useMemo(() => {
    return filteredNotices.filter((n) => !n.is_pinned);
  }, [filteredNotices]);

  // Group regular notices by date
  const groupedNotices = useMemo(() => {
    const groups: { [key: string]: Notice[] } = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Earlier: [],
    };

    regularNotices.forEach((n) => {
      const groupKey = getDateGroup(n.created_at);
      groups[groupKey].push(n);
    });

    return groups;
  }, [regularNotices]);

  return (
    <div className={styles.boardContainer}>
      {/* Search and Filters Bar */}
      <section className={`card ${styles.filterShelf}`}>
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <SearchIcon size={17} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements by title, topic, or keyword..."
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

        {/* Category Pills */}
        <div className={styles.categoryPillsRow} role="tablist" aria-label="Filter notices by category">
          {NOTICE_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isActive = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategory(cat)}
                className={`${styles.filterPill} ${
                  isActive ? styles.filterPillActive : ""
                }`}
              >
                <span>{cat}</span>
                <span className={styles.filterCountBadge}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* CR Composer */}
      {isCr && <NoticeComposer onCreated={handleNoticeCreated} />}

      {/* Empty State */}
      {filteredNotices.length === 0 ? (
        <div className={`card ${styles.emptySearchCard}`}>
          <DocIcon size={36} className={styles.emptyIcon} aria-hidden="true" />
          <h2 className={styles.emptyTitle}>No matching announcements found</h2>
          <p className={styles.emptyText}>
            {searchQuery
              ? `No notices match "${searchQuery}". Try different keywords or select a different category.`
              : `There are currently no notices in category "${selectedCategory}".`}
          </p>
          {(searchQuery || selectedCategory !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="btn yellow small"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className={styles.noticesListContainer}>
          {/* Pinned Shelf */}
          {pinnedNotices.length > 0 && (
            <section className={styles.pinnedSection} aria-label="Pinned Announcements">
              <div className={styles.sectionTitleRow}>
                <PinIcon size={16} aria-hidden="true" />
                <span className={styles.sectionTitleText}>Pinned Announcements</span>
                <span className={styles.sectionCountPill}>{pinnedNotices.length}</span>
              </div>
              <div className={styles.pinnedGrid}>
                {pinnedNotices.map((notice) => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    isCr={isCr}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Chronological Timeline Groups */}
          {(["Today", "Yesterday", "This Week", "Earlier"] as const).map((groupKey) => {
            const items = groupedNotices[groupKey];
            if (!items || items.length === 0) return null;

            return (
              <section key={groupKey} className={styles.timelineGroup} aria-label={`${groupKey} Announcements`}>
                <div className={styles.timelineHeader}>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  <span className={styles.timelineGroupLabel}>{groupKey}</span>
                  <span className={styles.timelineGroupCount}>{items.length}</span>
                </div>
                <div className={styles.groupCardsList}>
                  {items.map((notice) => (
                    <NoticeCard
                      key={notice.id}
                      notice={notice}
                      isCr={isCr}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Backwards-compatible NoticeActions export
export function NoticeActions({ id, pinned }: { id: string; pinned: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.cardActions}>
      <button
        className={styles.linkBtn}
        disabled={busy}
        onClick={() =>
          run(async () =>
            apiFetch(`/notices/${id}/pin`, await getAccessToken(), {
              method: "PATCH",
            })
          )
        }
      >
        {pinned ? "unpin" : "pin"}
      </button>
      <button
        className={`${styles.linkBtn} ${styles.danger}`}
        disabled={busy}
        onClick={() => {
          if (confirm("Delete this notice?")) {
            run(async () =>
              apiFetch(`/notices/${id}`, await getAccessToken(), {
                method: "DELETE",
              })
            );
          }
        }}
      >
        delete
      </button>
    </div>
  );
}
