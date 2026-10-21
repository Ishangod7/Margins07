"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import styles from "./AppShell.module.css";
import {
  HomeIcon,
  NoticeIcon,
  ResourceIcon,
  DoubtIcon,
  PeopleIcon,
  StarIcon,
  ActivityIcon,
  SettingsIcon,
  SearchIcon,
  BookOpenIcon,
  ClockIcon,
  ZapIcon,
} from "@/components/ui/Icons";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/notices", label: "Notices", icon: NoticeIcon, countKey: "notices" as const },
  { href: "/deadlines", label: "Deadlines", icon: ClockIcon },
  { href: "/revision", label: "Cram Mode", icon: ZapIcon },
  { href: "/subjects", label: "Subjects", icon: BookOpenIcon },
  { href: "/resources", label: "Resources", icon: ResourceIcon },
  { href: "/doubts", label: "Doubts", icon: DoubtIcon },
  { href: "/people", label: "People", icon: PeopleIcon },
  { href: "/saved", label: "Saved", icon: StarIcon },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/deadlines", label: "Deadlines", icon: ClockIcon },
  { href: "/subjects", label: "Subjects", icon: BookOpenIcon },
  { href: "/resources", label: "Resources", icon: ResourceIcon },
  { href: "/doubts", label: "Doubts", icon: DoubtIcon },
];

type Props = {
  children: React.ReactNode;
  noticeCount?: number;
  displayName?: string;
};

export default function AppShell({ children, noticeCount, displayName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const initials = (displayName ?? "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setToken(data.session?.access_token ?? null);
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="Margins Home">
          <div className={styles.brandMark}>M</div>
          <div className={styles.brandCopy}>
            <strong>MARGINS</strong>
            <span>AI&DS · DIVISION A</span>
          </div>
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navBtn} ${active ? styles.navBtnActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  <IconComponent size={18} />
                </span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.countKey === "notices" && typeof noticeCount === "number" && noticeCount > 0 && (
                  <span className={styles.navCount} aria-label={`${noticeCount} notices`}>
                    {noticeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarNote}>
          <small>DESK STATUS</small>
          <strong>you&apos;re all caught up</strong>
          <p>New notices and resources will show up right here as your batch posts them.</p>
        </div>

        <div className={styles.sidebarFooter}>
          <Link href="/activity" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ActivityIcon size={14} aria-hidden="true" />
            <span>Activity</span>
          </Link>
          <Link href="/settings" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <SettingsIcon size={14} aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push("/login");
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
              textDecoration: "underline",
              textDecorationStyle: "wavy",
            }}
          >
            log out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.searchTrigger}
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon size={16} aria-hidden="true" />
              <span>Search notices, resources, doubts, people</span>
              <span className={styles.shortcutKey}>Ctrl+K</span>
            </button>
          </div>
          <div className={styles.topActions}>
            <NotificationBell token={token} />
            <Link
              href="/settings"
              className={styles.avatar}
              aria-label={`Profile settings for ${displayName ?? "student"}`}
            >
              {initials}
            </Link>
          </div>
        </div>

        {children}
      </main>

      <nav className={styles.mobileBottomNav} aria-label="Mobile bottom navigation">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.mobileLink} ${active ? styles.mobileLinkActive : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span aria-hidden="true">
                <IconComponent size={18} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Global Unified Search Modal */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        token={token}
      />
    </div>
  );
}
