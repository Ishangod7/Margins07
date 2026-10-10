import Link from "next/link";
import styles from "./intro.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Margins — TCET AI&DS Division A",
  description: "Introduction and guide to Margins: a private study-desk and campus hub for our division.",
};

export default function IntroPage() {
  return (
    <main className={styles.introPage}>
      {/* Top Header */}
      <header className={styles.topNav}>
        <Link href="/intro" className={styles.brand}>
          <div className={styles.brandMark}>M</div>
          <div className={styles.brandText}>
            <strong>MARGINS</strong>
            <span>AI&DS · DIVISION A</span>
          </div>
        </Link>
        <div className={styles.navActions}>
          <Link href="/login" className="btn small">
            Log In
          </Link>
          <Link href="/signup" className="btn yellow small">
            Join Division A →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.heroWrap}>
        <div className={styles.pin}>📌</div>
        <div className={`card ${styles.heroCard}`}>
          <div className={styles.heroEyebrow}>
            ✎ TCET MUMBAI · AI&DS BATCH 2026
          </div>
          <h1 className={styles.heroTitle}>
            hey! welcome to <span className={styles.heroTitleHighlight}>margins</span>.
          </h1>
          <p className={styles.heroDesc}>
            Margins is a student-built, private study-desk created specifically for our 
            division. It gathers official class announcements, shared lecture notes, past papers, 
            and peer doubt solving into one quiet, permanent place — without WhatsApp chat chaos.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/signup" className={styles.btnPrimary}>
              Join Your Class (Sign Up) →
            </Link>
            <Link href="/login" className={styles.btnSecondary}>
              Open Your Desk (Log In) →
            </Link>
          </div>
          <p className={styles.heroFootnote}>
            ✦ Private & invite-gated for Division A · Ask your CR for the invite code
          </p>
        </div>
      </section>

      {/* The Contrast: WhatsApp vs Margins */}
      <section>
        <h2 className={styles.sectionTitle}>why did we build this?</h2>
        <p className={styles.sectionSub}>
          WhatsApp groups are great for quick memes, but terrible for surviving engineering.
        </p>

        <div className={styles.contrastGrid}>
          <div className={`card ${styles.problemCard}`}>
            <h3>❌ The WhatsApp Group Chaos</h3>
            <ul className={styles.checkList}>
              <li>
                <span>🔻</span>
                <div>
                  <strong>Important notices get buried:</strong> Crucial exam deadlines and assignment submission dates disappear under 200+ chat messages.
                </div>
              </li>
              <li>
                <span>🔻</span>
                <div>
                  <strong>Broken Google Drive links:</strong> Notes shared months ago become lost links, require access requests, or get deleted.
                </div>
              </li>
              <li>
                <span>🔻</span>
                <div>
                  <strong>Repeat questions:</strong> The same assignment doubt is asked 10 times in different threads without a clear answer.
                </div>
              </li>
              <li>
                <span>🔻</span>
                <div>
                  <strong>Notification anxiety:</strong> Constant group alerts late at night with no way to filter what actually matters.
                </div>
              </li>
            </ul>
          </div>

          <div className={`card ${styles.solutionCard}`}>
            <h3>✅ The Margins Study Desk</h3>
            <ul className={styles.checkList}>
              <li>
                <span>✦</span>
                <div>
                  <strong>CR Announcements Front & Center:</strong> Pinned notices stay right at the top of your screen until you read them.
                </div>
              </li>
              <li>
                <span>✦</span>
                <div>
                  <strong>Permanent Resource Shelf:</strong> PYQs, textbook PDFs, professor slides, and curated YouTube playlists sorted by subject.
                </div>
              </li>
              <li>
                <span>✦</span>
                <div>
                  <strong>Trackable Doubt Board:</strong> Ask questions once, get peer answers, upvote explanations, and mark solutions as solved.
                </div>
              </li>
              <li>
                <span>✦</span>
                <div>
                  <strong>Quiet & Purposeful:</strong> A dedicated notebook you visit when you need to study, without midnight phone buzzing.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* The 4 Core Desks */}
      <section>
        <h2 className={styles.sectionTitle}>what can you do here?</h2>
        <p className={styles.sectionSub}>
          Everything you need for the semester, organized into four clean desks:
        </p>

        <div className={styles.featuresGrid}>
          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>📌</div>
            <h4>Notice Board</h4>
            <p>
              Official announcements posted directly by your Class Representative (CR). 
              Timetables, KT exam forms, syllabus changes, and submission deadlines pinned so you never miss a date.
            </p>
            <span className={styles.featureTag}>CR Verified</span>
          </div>

          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>📚</div>
            <h4>Resource Shelf</h4>
            <p>
              Curated notes, Mumbai University past-year questions (PYQs), question banks, and reference PDFs 
              organized neatly by subject so you're ready when exam season arrives.
            </p>
            <span className={styles.featureTag}>Notes & PYQs</span>
          </div>

          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>💡</div>
            <h4>Doubt Board</h4>
            <p>
              Stuck on math derivations, code bugs, or lab manual questions? Post a doubt, 
              get answers from classmates, upvote the clearest explanation, and tag it as solved.
            </p>
            <span className={styles.featureTag}>Peer Learning</span>
          </div>

          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>🧑‍🤝‍🧑</div>
            <h4>People & Directory</h4>
            <p>
              Discover what your classmates are learning and who can help with Python, DSA, ML, or Web Dev. 
              Find project partners with 100% control over your personal privacy toggles.
            </p>
            <span className={styles.featureTag}>Class Network</span>
          </div>
        </div>
      </section>

      {/* The Privacy & Trust Promise */}
      <section className={styles.promiseCard}>
        <div className={styles.promiseHeader}>
          <h3>our privacy promise to the class ✎</h3>
          <span className={styles.promiseBadge}>100% Student-First</span>
        </div>
        <div className={styles.promiseGrid}>
          <div className={styles.promiseItem}>
            <strong>🔒 Division A Only</strong>
            <span>Access is strictly restricted to our 63 batchmates via the CR invite code. Strangers cannot join.</span>
          </div>
          <div className={styles.promiseItem}>
            <strong>🙈 Zero Faculty Access</strong>
            <span>Built by students for students. Professors and college administration have zero access or oversight.</span>
          </div>
          <div className={styles.promiseItem}>
            <strong>🚫 No Attendance or Marks Stalking</strong>
            <span>We will never track your marks, attendance records, or college disciplinary data.</span>
          </div>
          <div className={styles.promiseItem}>
            <strong>📦 You Own Your Data</strong>
            <span>You control what classmates see on your profile. You can export or delete your account at any time.</span>
          </div>
        </div>
      </section>

      {/* Ready to join CTA Card */}
      <section className={styles.ctaCard}>
        <h3>ready to claim your desk?</h3>
        <p>
          Registration takes 30 seconds. All you need is your college email and the 
          current Division A invite code from your CR.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/signup" className={styles.btnPrimary}>
            Join Division A (Sign Up) →
          </Link>
          <Link href="/login" className={styles.btnSecondary}>
            Already Registered? Log In →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Margins — TCET Mumbai · AI&DS Division A Study Hub</p>
        <div className={styles.footerLinks}>
          <Link href="/login">Log In</Link>
          <Link href="/signup">Sign Up</Link>
          <Link href="/notices">Notice Board</Link>
        </div>
      </footer>
    </main>
  );
}
