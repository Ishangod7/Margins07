import Link from "next/link";
import type { Metadata } from "next";
import {
  NoticeIcon,
  ResourceIcon,
  DoubtIcon,
  PeopleIcon,
  SettingsIcon,
  SearchIcon,
  CheckIcon,
  CrossIcon,
  LockIcon,
  ShieldIcon,
  DatabaseIcon,
  SparklesIcon,
} from "@/components/ui/Icons";
import styles from "./intro.module.css";

export const metadata: Metadata = {
  title: "About Margins — TCET AI&DS Division A",
  description:
    "Introduction and guide to Margins: a private study desk and campus hub for TCET Mumbai AI&DS Division A.",
};

export default function IntroPage() {
  return (
    <main className={styles.introPage}>
      {/* Topbar matching AppShell */}
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Margins Home">
          <div className={styles.brandMark}>M</div>
          <div className={styles.brandCopy}>
            <strong>MARGINS</strong>
            <span>AI&DS · DIVISION A</span>
          </div>
        </Link>

        <div className={styles.topSearchMock} aria-hidden="true">
          <SearchIcon size={15} />
          <span>Campus study desk for TCET Mumbai AI&DS</span>
        </div>

        <div className={styles.topActions}>
          <Link href="/login" className="btn small">
            Log In
          </Link>
          <Link href="/signup" className="btn yellow small">
            Join Division A →
          </Link>
        </div>
      </header>

      {/* Intro Heading matching main */}
      <section className={styles.homeIntro}>
        <div>
          <div className="eyebrow">TCET MUMBAI · AI&DS BATCH 2026–30</div>
          <h1>welcome to margins.</h1>
          <p>your division's private study desk & campus hub.</p>
        </div>
        <div className={styles.dateNote}>
          <small>BATCH</small>
          <strong>DIV A</strong>
          <small>2026–30</small>
        </div>
      </section>

      {/* Hero Card matching main */}
      <div className={styles.heroWrap}>
        <div className={styles.heroNote}>class desk!</div>
        <section className={`card ${styles.hero}`}>
          <div className={styles.heroLabel}>
            <span className={styles.heroDot}></span>
            PRIVATE & INVITE-GATED CAMPUS HUB
          </div>
          <h2>Everything our class needs. Zero WhatsApp chaos.</h2>
          <div className={styles.heroMeta}>
            <span>Notice Board</span>
            <span>•</span>
            <span>Resource Shelf</span>
            <span>•</span>
            <span>Doubt Board</span>
            <span>•</span>
            <span>Class Directory</span>
          </div>
          <p className={styles.heroDesc}>
            Margins is a student-built, private study desk created specifically for our
            division. It gathers official class announcements, shared lecture notes, past
            exam papers (PYQs), and peer doubt solving into one quiet, permanent place
            — without messages getting buried in chat groups.
          </p>
          <div className={styles.heroActions}>
            <Link href="/signup" className="btn yellow">
              join your class (sign up) →
            </Link>
            <Link href="/login" className="btn">
              open your desk (log in) →
            </Link>
          </div>
        </section>
      </div>

      {/* 2-Column Grid matching main */}
      <div className={styles.homeGrid}>
        {/* Left Stack */}
        <div className={styles.stack}>
          {/* Panel 1: Why we built Margins (The Contrast) */}
          <section className={`card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <h3>why did we build this?</h3>
              <span>the study desk contrast</span>
            </div>

            <div className={styles.contrastContainer}>
              {/* WhatsApp Chaos */}
              <div className={styles.chaosCard}>
                <h4>
                  <CrossIcon size={14} /> WhatsApp Group Chaos
                </h4>
                <ul className={styles.contrastList}>
                  <li>
                    <CrossIcon size={14} style={{ color: "#ab3f38", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Notices get buried:</strong>
                      <span>Crucial exam forms and submission dates vanish under hundreds of casual messages.</span>
                    </div>
                  </li>
                  <li>
                    <CrossIcon size={14} style={{ color: "#ab3f38", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Broken Drive links:</strong>
                      <span>Notes shared months ago get lost, require permission requests, or are removed.</span>
                    </div>
                  </li>
                  <li>
                    <CrossIcon size={14} style={{ color: "#ab3f38", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Repeated doubts:</strong>
                      <span>The same lab code or math derivation is asked repeatedly across different chat threads.</span>
                    </div>
                  </li>
                  <li>
                    <CrossIcon size={14} style={{ color: "#ab3f38", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Notification fatigue:</strong>
                      <span>Group pings late at night with no filter between urgent updates and casual chatter.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Margins Study Desk */}
              <div className={styles.deskCard}>
                <h4>
                  <CheckIcon size={14} /> The Margins Study Desk
                </h4>
                <ul className={styles.contrastList}>
                  <li>
                    <CheckIcon size={14} style={{ color: "#437841", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Pinned CR Announcements:</strong>
                      <span>Official notices stay visible right at the top of your screen until you review them.</span>
                    </div>
                  </li>
                  <li>
                    <CheckIcon size={14} style={{ color: "#437841", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Permanent Resource Shelf:</strong>
                      <span>MU PYQs, slides, reference PDFs, and videos sorted neatly by subject and unit.</span>
                    </div>
                  </li>
                  <li>
                    <CheckIcon size={14} style={{ color: "#437841", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Trackable Doubt Board:</strong>
                      <span>Ask questions once, get peer answers, upvote solutions, and mark doubts as resolved.</span>
                    </div>
                  </li>
                  <li>
                    <CheckIcon size={14} style={{ color: "#437841", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Quiet & Purposeful:</strong>
                      <span>A focused notebook space you visit when you need to study, without midnight phone pings.</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Panel 2: The 4 Desks */}
          <section className={`card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <h3>the four desks on your table</h3>
              <Link href="/login" style={{ font: "15px 'Patrick Hand', cursive", color: "var(--blue)", textDecoration: "underline", textDecorationStyle: "wavy" }}>
                explore desks →
              </Link>
            </div>

            <div className={styles.desksGrid}>
              <div className={styles.deskItem}>
                <div className={styles.deskItemTop}>
                  <div className={styles.deskItemIcon} aria-hidden="true">
                    <NoticeIcon size={18} />
                  </div>
                  <span className={styles.deskItemTag}>CR VERIFIED</span>
                </div>
                <h4>Notice Board</h4>
                <p>
                  Class announcements posted directly by your Class Representative.
                  Timetables, KT exam forms, syllabus revisions, and deadlines pinned
                  for class convenience. Official college notice boards and ERP circulars remain the source of truth.
                </p>
              </div>

              <div className={styles.deskItem}>
                <div className={styles.deskItemTop}>
                  <div className={styles.deskItemIcon} aria-hidden="true">
                    <ResourceIcon size={18} />
                  </div>
                  <span className={styles.deskItemTag}>NOTES & PYQs</span>
                </div>
                <h4>Resource Shelf</h4>
                <p>
                  Curated class notes, Mumbai University past papers (PYQs), question banks,
                  and textbook references organized cleanly by subject for exam preparation.
                </p>
              </div>

              <div className={styles.deskItem}>
                <div className={styles.deskItemTop}>
                  <div className={styles.deskItemIcon} aria-hidden="true">
                    <DoubtIcon size={18} />
                  </div>
                  <span className={styles.deskItemTag}>PEER LEARNING</span>
                </div>
                <h4>Doubt Board</h4>
                <p>
                  Stuck on algorithms, math derivations, or lab setups? Post a doubt,
                  receive explanations from classmates, upvote the clearest answer, and mark it resolved.
                </p>
              </div>

              <div className={styles.deskItem}>
                <div className={styles.deskItemTop}>
                  <div className={styles.deskItemIcon} aria-hidden="true">
                    <PeopleIcon size={18} />
                  </div>
                  <span className={styles.deskItemTag}>CLASS NETWORK</span>
                </div>
                <h4>People & Directory</h4>
                <p>
                  Discover what classmates are learning, find study partners for mini-projects
                  and hackathons, with granular personal privacy controls.
                </p>
              </div>
            </div>
          </section>

          {/* Panel 3: Privacy Promise */}
          <section className={`card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <h3>our privacy promise to the batch</h3>
              <span>100% student-first</span>
            </div>

            <div className={styles.promiseGrid}>
              <div className={styles.promiseBox}>
                <div className={styles.promiseBoxHeader}>
                  <LockIcon size={16} /> Division A Only
                </div>
                <p>
                  Access is strictly limited to our 63 batchmates via the CR invite code.
                  Outside accounts cannot join.
                </p>
              </div>

              <div className={styles.promiseBox}>
                <div className={styles.promiseBoxHeader}>
                  <ShieldIcon size={16} /> Zero Faculty Access
                </div>
                <p>
                  Built by students for students. College professors and administration
                  have zero access, moderation, or oversight.
                </p>
              </div>

              <div className={styles.promiseBox}>
                <div className={styles.promiseBoxHeader}>
                  <SparklesIcon size={16} /> No Marks Surveillance
                </div>
                <p>
                  We will never track or display your marks, attendance records, or
                  disciplinary status.
                </p>
              </div>

              <div className={styles.promiseBox}>
                <div className={styles.promiseBoxHeader}>
                  <DatabaseIcon size={16} /> You Own Your Data
                </div>
                <p>
                  You control what classmates see on your profile. You can export or delete
                  your data at any time via Settings under India's DPDP Act 2023.
                </p>
                <div style={{ marginTop: 8 }}>
                  <Link href="/privacy" style={{ fontSize: "12px", textDecoration: "underline", color: "var(--blue)" }}>
                    Read our Privacy Notice →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Stack (Sidebar) */}
        <aside className={styles.stack}>
          {/* Card 1: Sticky Batch Facts */}
          <section className={`card ${styles.sticky}`}>
            <div className={styles.stickyTitle}>quick batch facts</div>
            <div className={styles.factRow}>
              <div className={styles.factPill}>DIV A</div>
              <div>
                <div className={styles.factTitle}>TCET Mumbai</div>
                <div className={styles.factDesc}>Artificial Intelligence & Data Science</div>
              </div>
            </div>
            <div className={styles.factRow}>
              <div className={styles.factPill}>63</div>
              <div>
                <div className={styles.factTitle}>Batchmates</div>
                <div className={styles.factDesc}>Batch 2026–30 division roster</div>
              </div>
            </div>
            <div className={styles.factRow}>
              <div className={styles.factPill}>CODE</div>
              <div>
                <div className={styles.factTitle}>CR Invite Gated</div>
                <div className={styles.factDesc}>Verified with your college email</div>
              </div>
            </div>
          </section>

          {/* Card 2: Quick Tools (Matching main dashboard toolGrid) */}
          <section className={`card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <h3>quick stuff</h3>
            </div>
            <div className={styles.toolGrid}>
              <Link href="/resources" className={styles.tool}>
                <div className={styles.toolIcon} aria-hidden="true">
                  <ResourceIcon size={20} />
                </div>
                <div className={styles.toolName}>resources</div>
                <div className={styles.toolDescription}>notes + PYQs</div>
              </Link>
              <Link href="/doubts" className={styles.tool}>
                <div className={styles.toolIcon} aria-hidden="true">
                  <DoubtIcon size={20} />
                </div>
                <div className={styles.toolName}>doubts</div>
                <div className={styles.toolDescription}>ask + answer</div>
              </Link>
              <Link href="/notices" className={styles.tool}>
                <div className={styles.toolIcon} aria-hidden="true">
                  <NoticeIcon size={20} />
                </div>
                <div className={styles.toolName}>notices</div>
                <div className={styles.toolDescription}>all announcements</div>
              </Link>
              <Link href="/settings" className={styles.tool}>
                <div className={styles.toolIcon} aria-hidden="true">
                  <SettingsIcon size={20} />
                </div>
                <div className={styles.toolName}>settings</div>
                <div className={styles.toolDescription}>your profile</div>
              </Link>
            </div>
          </section>

          {/* Card 3: Claim Your Desk Action Card */}
          <section className={`card ${styles.aiCard}`}>
            <div className={styles.aiTitle}>claim your desk</div>
            <div className={styles.aiText}>
              Registration takes 30 seconds. All you need is your college email and the current
              Division A invite code from your CR.
            </div>
            <Link
              href="/signup"
              className="btn yellow"
              style={{ marginTop: 14, width: "100%", justifyContent: "center" }}
            >
              join division a →
            </Link>
          </section>
        </aside>
      </div>

      {/* Footer matching sketchbook */}
      <footer className={styles.footer}>
        <p>Margins — TCET Mumbai · AI&DS Division A Study Hub</p>
        <div className={styles.footerLinks}>
          <Link href="/login">Log In</Link>
          <Link href="/signup">Sign Up</Link>
          <Link href="/notices">Notice Board</Link>
          <Link href="/privacy">Privacy Notice</Link>
          <Link href="/terms">Terms of Use</Link>
        </div>
      </footer>
    </main>
  );
}
