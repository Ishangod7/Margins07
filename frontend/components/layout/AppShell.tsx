"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/notices", label: "Notices", icon: "📌", countKey: "notices" as const },
  { href: "/resources", label: "Resources", icon: "📚" },
  { href: "/doubts", label: "Doubts", icon: "💡" },
  { href: "/people", label: "People", icon: "🧑‍🤝‍🧑" },
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
        <Link href="/" className={styles.brand}>
          <div className={styles.brandMark}>M</div>
          <div className={styles.brandCopy}>
            <strong>MARGINS</strong>
            <span>AI&DS · DIVISION A</span>
          </div>
        </Link>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navBtn} ${active ? styles.navBtnActive : ""}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.countKey === "notices" && typeof noticeCount === "number" && (
                  <span className={styles.navCount}>{noticeCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarNote}>
          <small>PSST</small>
          <strong>you're all caught up</strong>
          <p>New notices and resources will show up right here as your batch posts them.</p>
        </div>

        <div className={styles.sidebarFooter}>
          <Link href="/settings">⚙ Settings</Link>
          <button
            onClick={async () => {
              const { createClient } = await import("@/lib/supabase/client");
              await createClient().auth.signOut();
              router.push("/login");
            }}
            style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", color: "inherit", textDecoration: "underline", textDecorationStyle: "wavy" }}
          >
            log out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.searchTrigger}>
              🔍 <span>Search notices, resources, doubts, people</span>
            </button>
          </div>
          <div className={styles.topActions}>
            <Link href="/settings" className={styles.avatar}>{initials}</Link>
          </div>
        </div>

        {children}
      </main>

      <nav className={styles.mobileBottomNav}>
        {BOTTOM_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.mobileLink} ${pathname === item.href ? styles.mobileLinkActive : ""}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
