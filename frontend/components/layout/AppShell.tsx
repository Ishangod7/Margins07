"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AppShell.module.css";
import {
  HomeIcon,
  NoticeIcon,
  ResourceIcon,
  DoubtIcon,
  PeopleIcon,
  SettingsIcon,
  SearchIcon,
} from "@/components/ui/Icons";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/notices", label: "Notices", icon: NoticeIcon, countKey: "notices" as const },
  { href: "/resources", label: "Resources", icon: ResourceIcon },
  { href: "/doubts", label: "Doubts", icon: DoubtIcon },
  { href: "/people", label: "People", icon: PeopleIcon },
];

const BOTTOM_NAV_ITEMS = NAV_ITEMS.slice(0, 4);

type Props = {
  children: React.ReactNode;
  noticeCount?: number;
  displayName?: string;
};

export default function AppShell({ children, noticeCount, displayName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = (displayName ?? "?").trim().charAt(0).toUpperCase();

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
                {item.countKey === "notices" && typeof noticeCount === "number" && (
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
          <strong>you're all caught up</strong>
          <p>New notices and resources will show up right here as your batch posts them.</p>
        </div>

        <div className={styles.sidebarFooter}>
          <Link href="/settings" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <SettingsIcon size={14} aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <button
            onClick={async () => {
              const { createClient } = await import("@/lib/supabase/client");
              await createClient().auth.signOut();
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
            <button className={styles.searchTrigger} type="button" aria-label="Search">
              <SearchIcon size={16} aria-hidden="true" />
              <span>Search notices, resources, doubts, people</span>
            </button>
          </div>
          <div className={styles.topActions}>
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
    </div>
  );
}
