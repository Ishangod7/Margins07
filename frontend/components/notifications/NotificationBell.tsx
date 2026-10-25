"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, NoticeIcon, DoubtIcon, ResourceIcon, CheckIcon } from "@/components/ui/Icons";
import { apiFetch, type NotificationItem, type NotificationsResponse } from "@/lib/api";
import styles from "./notifications.module.css";

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function NotificationBell({ token }: { token: string | null }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load last read timestamp from localStorage
  const getLastRead = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("margins_notif_last_read");
  };

  const setLastRead = (isoString: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("margins_notif_last_read", isoString);
    }
  };

  // Fetch notifications
  const fetchNotifications = async (isManualClick = false) => {
    if (!token) return;
    try {
      if (isManualClick) setLoading(true);
      const lastRead = getLastRead();
      const url = lastRead ? `/notifications?since=${encodeURIComponent(lastRead)}` : `/notifications`;
      const res = await apiFetch<NotificationsResponse>(url, token);
      setItems(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    } finally {
      if (isManualClick) setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();
    // Periodic refresh every 60s
    const timer = setInterval(() => {
      fetchNotifications();
    }, 60000);
    return () => clearInterval(timer);
  }, [token]);

  // Click outside and ESC key handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications(true);
    }
  };

  const markAllRead = () => {
    const nowIso = new Date().toISOString();
    setLastRead(nowIso);
    setUnreadCount(0);
  };

  const handleItemClick = (item: NotificationItem) => {
    setIsOpen(false);
    // Mark as read up to this item's created_at
    const currentLast = getLastRead();
    if (!currentLast || new Date(item.created_at) > new Date(currentLast)) {
      setLastRead(new Date().toISOString());
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    router.push(item.link);
  };

  const lastReadDate = getLastRead();

  return (
    <div className={styles.notifContainer} ref={containerRef}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={toggleOpen}
        aria-label="View notifications"
        title="Class notices and updates"
      >
        <BellIcon size={19} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdownPopover}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>desk notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className={styles.markReadBtn}
                onClick={markAllRead}
              >
                mark all read
              </button>
            )}
          </div>

          <div className={styles.dropdownList}>
            {loading ? (
              <div className={styles.emptyState}>Checking the desk for updates...</div>
            ) : items.length === 0 ? (
              <div className={styles.emptyState}>
                all quiet on the desk.<br />
                no new notices or activity.
              </div>
            ) : (
              items.map((item) => {
                const isUnread =
                  !lastReadDate || new Date(item.created_at) > new Date(lastReadDate);

                let iconComponent = <NoticeIcon size={14} />;
                if (item.type === "answer") iconComponent = <DoubtIcon size={14} />;
                if (item.type === "accepted") iconComponent = <CheckIcon size={14} />;
                if (item.type === "resource") iconComponent = <ResourceIcon size={14} />;

                return (
                  <div
                    key={item.id}
                    className={`${styles.notifItem} ${isUnread ? styles.itemUnread : ""}`}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.notifIconWrap}>{iconComponent}</div>
                    <div className={styles.notifContent}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      {item.body && <span className={styles.itemSnippet}>{item.body}</span>}
                      <div className={styles.itemMeta}>
                        <span>{item.actor_name}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.dropdownFooter}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} /> Div A Live Stream
            </span>
            <span style={{ fontSize: "12px", opacity: 0.85 }}>TCET Autonomous</span>
          </div>
        </div>
      )}
    </div>
  );
}
