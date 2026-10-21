"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SearchIcon, CrossIcon } from "@/components/ui/Icons";
import styles from "./search.module.css";

interface SearchResults {
  q: string;
  notices: Array<{ id: string; title: string; category: string; content?: string }>;
  resources: Array<{ id: string; title: string; kind: string; unit?: string; subject_name?: string }>;
  doubts: Array<{ id: string; title: string; status: string; answer_count?: number }>;
  people: Array<{ id: string; display_name: string; initials: string; role: string; skills?: string[] }>;
  total_count: number;
}

export function SearchOverlay({
  isOpen,
  onClose,
  token,
}: {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll and auto-focus when open
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults(null);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Debounced search fetch
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<SearchResults>(
          `/search?q=${encodeURIComponent(query.trim())}`,
          token
        );
        setResults(data);
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(handler);
  }, [query, token]);

  if (!isOpen || !mounted) return null;

  function handleSelect(href: string) {
    onClose();
    router.push(href);
  }

  return createPortal(
    <div className={styles.searchBackdrop} onClick={onClose}>
      <div className={styles.searchCard} onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className={styles.searchHeader}>
          <SearchIcon size={20} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Search notices, resources, doubts, classmates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className={styles.shortcutBadge}>ESC</span>
        </div>

        {/* Results Body */}
        <div className={styles.resultsArea}>
          {!query.trim() ? (
            <div className={styles.promptState}>
              <h3>desk search</h3>
              <p>Type keywords to search across all Div A notices, study shelf, doubts, and peers.</p>
            </div>
          ) : loading ? (
            <div className={styles.promptState}>
              <p>Searching the shelf & desk...</p>
            </div>
          ) : results && results.total_count === 0 ? (
            <div className={styles.promptState}>
              <h3>no results found</h3>
              <p>Nothing on Margins matched &ldquo;{query}&rdquo;. Try another term.</p>
            </div>
          ) : results ? (
            <div>
              {/* Notices */}
              {results.notices.length > 0 && (
                <div className={styles.sectionGroup}>
                  <div className={styles.sectionTitle}>Notices ({results.notices.length})</div>
                  {results.notices.map((n) => (
                    <div
                      key={n.id}
                      className={styles.resultItem}
                      onClick={() => handleSelect(`/notices`)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.itemLeft}>
                        <span className={styles.itemTitle}>{n.title}</span>
                        {n.content && (
                          <span className={styles.itemSnippet}>{n.content.slice(0, 75)}...</span>
                        )}
                      </div>
                      <span className={styles.itemTag}>{n.category}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Resources */}
              {results.resources.length > 0 && (
                <div className={styles.sectionGroup}>
                  <div className={styles.sectionTitle}>Resources ({results.resources.length})</div>
                  {results.resources.map((r) => (
                    <div
                      key={r.id}
                      className={styles.resultItem}
                      onClick={() => handleSelect(`/resources?q=${encodeURIComponent(r.title)}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.itemLeft}>
                        <span className={styles.itemTitle}>{r.title}</span>
                        {r.subject_name && (
                          <span className={styles.itemSnippet}>{r.subject_name} {r.unit ? `· ${r.unit}` : ""}</span>
                        )}
                      </div>
                      <span className={styles.itemTag}>{r.kind.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Doubts */}
              {results.doubts.length > 0 && (
                <div className={styles.sectionGroup}>
                  <div className={styles.sectionTitle}>Doubts ({results.doubts.length})</div>
                  {results.doubts.map((d) => (
                    <div
                      key={d.id}
                      className={styles.resultItem}
                      onClick={() => handleSelect(`/doubts/${d.id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.itemLeft}>
                        <span className={styles.itemTitle}>{d.title}</span>
                        <span className={styles.itemSnippet}>
                          {d.status === "solved" ? "Solved" : d.status === "answered" ? "Answered" : "Open"} · {d.answer_count ?? 0} answers
                        </span>
                      </div>
                      <span className={styles.itemTag} style={{ textTransform: "uppercase" }}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* People */}
              {results.people.length > 0 && (
                <div className={styles.sectionGroup}>
                  <div className={styles.sectionTitle}>Classmates ({results.people.length})</div>
                  {results.people.map((p) => (
                    <div
                      key={p.id}
                      className={styles.resultItem}
                      onClick={() => handleSelect(`/people/${p.id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.itemLeft}>
                        <span className={styles.itemTitle}>{p.display_name}</span>
                        {p.skills && p.skills.length > 0 && (
                          <span className={styles.itemSnippet}>#{p.skills.slice(0, 3).join(" #")}</span>
                        )}
                      </div>
                      <span className={styles.itemTag}>
                        {p.role === "cr" ? "CR" : "MEMBER"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer info */}
        <div className={styles.searchFooter}>
          <span>Use <strong>ESC</strong> to close</span>
          <span>Margins Global Search</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
