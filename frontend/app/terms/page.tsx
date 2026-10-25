import type { Metadata } from "next";
import Link from "next/link";
import styles from "../privacy/privacy.module.css";

export const metadata: Metadata = {
  title: "Terms of Use — Margins",
  description:
    "Community rules, acceptable academic use, copyright policy, and non-official disclaimer for Margins (TCET AI&DS Division A).",
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <Link href="/intro" className={styles.brandLink}>
            <div className={styles.brandMark}>M</div>
            <div className={styles.brandCopy}>
              <strong>MARGINS</strong>
              <span>AI&DS · DIVISION A</span>
            </div>
          </Link>
          <div className={styles.topActions}>
            <Link href="/login" className="btn small">
              Log In
            </Link>
            <Link href="/signup" className="btn yellow small">
              Join Division A →
            </Link>
          </div>
        </header>

        {/* Content Card */}
        <article className={styles.card}>
          <div className={styles.badgeRow}>
            <span className={`${styles.pill} ${styles.pillStatute}`}>
              COMMUNITY GUIDELINES & ACADEMIC INTEGRITY
            </span>
            <span className={styles.pill}>DIVISION A · TCET MUMBAI</span>
          </div>

          <h1 className={styles.title}>terms of use</h1>
          <p className={styles.subtitle}>
            Rules of the road for our class desk. Designed to keep Margins respectful,
            academically honest, and focused on helping every batchmate succeed.
          </p>

          <div className={styles.metaInfo}>
            <div>
              <strong>Effective Date:</strong> October 25, 2026
            </div>
            <div>
              <strong>Target Group:</strong> TCET Mumbai · AI&DS Division A (Batch 2026–30)
            </div>
            <div>
              <strong>Moderation:</strong> Elected Class Representatives & Student Admins
            </div>
          </div>

          {/* §1: Important Disclaimer: Not Official College Channel */}
          <section className={styles.section}>
            <h2>1. Important disclaimer: not an official college service</h2>
            <div className={styles.highlightBox}>
              <strong>Independent Student Initiative:</strong>
              Margins is an independent, student-built software project created by students for classmates.
              It is NOT run, owned, administered, or endorsed by Thakur College of Engineering & Technology (TCET),
              the Department of Artificial Intelligence & Data Science, or the University of Mumbai.
            </div>
            <p>
              Notices posted on the Notice Board are transcribed or pinned by the Class Representative (CR) for class
              convenience. Official college circulars, ERP portals, and institutional notice boards remain the sole
              authoritative sources of truth for examination dates, fee submissions, attendance criteria, and college policies.
              Students must verify critical academic deadlines through official college channels.
            </p>
          </section>

          {/* §2: Eligibility & Registration */}
          <section className={styles.section}>
            <h2>2. Eligibility & account registration</h2>
            <ul>
              <li>
                <strong>Eligible Users:</strong> Access is strictly restricted to students currently enrolled in
                TCET Mumbai Department of Artificial Intelligence & Data Science, Division A (Batch 2026–30).
              </li>
              <li>
                <strong>Credentials:</strong> Registration requires a valid institutional college email address
                (ending in <code>@tcetmumbai.in</code>) and an active Division A invite code obtained from the Class Representative.
              </li>
              <li>
                <strong>Single Account Rule:</strong> Each student is permitted one account only. Impersonation of classmates,
                faculty, or college authorities is strictly prohibited.
              </li>
              <li>
                <strong>Invite Code Confidentiality:</strong> Invite codes are distributed confidentially to verified division
                members. Sharing invite codes with individuals outside Division A is grounds for account suspension.
              </li>
            </ul>
          </section>

          {/* §3: Academic Integrity & Acceptable Use */}
          <section className={styles.section}>
            <h2>3. Academic integrity & acceptable conduct</h2>
            <p>
              Margins is a focused study desk built on mutual trust. By using Margins, you agree to uphold academic honesty:
            </p>
            <ul>
              <li>
                <strong>Peer Learning Only:</strong> The Doubt Board and Resource Shelf are intended for peer study, conceptual
                clarifications, and exam preparation.
              </li>
              <li>
                <strong>No Live Exam Assistance:</strong> Posting questions, requesting answers, or sharing solutions during
                active examinations, class tests, in-semester evaluations (ISE), or proctored practical assessments is strictly forbidden.
              </li>
              <li>
                <strong>No Harassment or Bullying:</strong> Respect all batchmates. Demeaning remarks, harassment, offensive language,
                personal attacks, or discrimination based on gender, background, or academic performance will result in immediate removal.
              </li>
              <li>
                <strong>No Doxxing:</strong> Do not post or share private contact numbers, personal addresses, or private photos
                of any student or faculty member.
              </li>
            </ul>
          </section>

          {/* §4: Resource Shelf & Copyright Policy */}
          <section className={styles.section}>
            <h2>4. Resource Shelf, notes & copyright policy</h2>
            <p>
              The Resource Shelf serves as an archive for lecture notes, syllabus guides, and past examination papers.
              We take intellectual property and educational fair dealing seriously:
            </p>
            <ul>
              <li>
                <strong>Permitted Uploads:</strong> Student-authored handwritten or digital notes, formula sheets, lab code
                written by students, publicly released university syllabus documents, and historical past question papers (PYQs).
              </li>
              <li>
                <strong>Prohibited Uploads:</strong> Scanned copies of copyrighted commercial textbooks, paid test series materials,
                proprietary question banks sold for profit, or confidential faculty evaluation keys.
              </li>
              <li>
                <strong>Takedown Procedure:</strong> If you are a copyright holder, author, or faculty member and believe any
                document hosted on Margins infringes your intellectual property, notify us immediately with the resource title
                at <strong>ishan.gupta.aids@tcetmumbai.in</strong>. Infringing materials will be removed within 24 hours of notice.
              </li>
            </ul>
          </section>

          {/* §5: Content Ownership & License */}
          <section className={styles.section}>
            <h2>5. Content ownership and student rights</h2>
            <p>
              You retain full ownership of the notes, questions, and explanations you contribute to Margins.
              By sharing content on Margins, you grant your classmates and the platform a non-exclusive, royalty-free,
              revocable license to view, download, and study from your material solely for academic purposes within Division A.
            </p>
            <p>
              You may remove or request deletion of any resource or solution you authored at any time via Settings or by
              contacting the Class Representative.
            </p>
          </section>

          {/* §6: Community Moderation & Enforcement */}
          <section className={styles.section}>
            <h2>6. Community moderation & appeal process</h2>
            <ul>
              <li>
                <strong>Moderation Authority:</strong> The elected Class Representative and designated division student moderators
                have the authority to unpin, edit, or delete notices, doubts, answers, or files that violate these terms.
              </li>
              <li>
                <strong>Account Actions:</strong> Repeated or severe violations (such as academic dishonesty during live exams or
                harassment) will lead to account suspension or expulsion from the Margins platform.
              </li>
              <li>
                <strong>Appeals:</strong> If you believe content or an account was removed in error, you may email a statement of
                appeal to <strong>ishan.gupta.aids@tcetmumbai.in</strong> for review by division representatives.
              </li>
            </ul>
          </section>

          {/* §7: Platform Availability */}
          <section className={styles.section}>
            <h2>7. Availability and service disclaimer</h2>
            <p>
              Margins is provided on an "as is" and "as available" basis. It is developed voluntarily by engineering students
              during non-class hours without commercial funding:
            </p>
            <ul>
              <li>
                We do not guarantee uninterrupted 100% uptime or error-free operation. Server maintenance, database migrations,
                or third-party infrastructure outages (e.g. Vercel, Supabase) may occasionally cause temporary downtime.
              </li>
              <li>
                Students are strongly encouraged to keep local copies of their own important revision notes and project files.
              </li>
            </ul>
          </section>

          {/* §8: Termination & Batch Graduation */}
          <section className={styles.section}>
            <h2>8. Graduation and service conclusion</h2>
            <p>
              These Terms remain active while your cohort is enrolled in TCET Mumbai (Academic Years 2026–2030).
              Upon completion of the eighth semester and final degree conferral in 2030, the student roster will be archived,
              personal accounts purged, and the platform decommissioned or transitioned to future class leadership.
            </p>
          </section>

          {/* §9: Contact & Takedown Notices */}
          <section className={styles.section}>
            <h2>9. Contact for takedowns and community inquiries</h2>
            <div className={styles.highlightBox}>
              <strong>Community Administrator & CR Desk:</strong>
              <div>Ishan Gupta (Class Representative, TCET AI&DS Div A)</div>
              <div>Official Email: ishan.gupta.aids@tcetmumbai.in</div>
              <div>Emergency Copyright & Takedown Turnaround: &lt; 24 Hours</div>
            </div>
          </section>

          {/* Footer Notes */}
          <div className={styles.footerNotes}>
            <p>
              By signing up for Margins or logging into the desk, you affirm that you have read, understood,
              and agree to abide by these Terms of Use and our accompanying{" "}
              <Link href="/privacy" style={{ textDecoration: "underline", color: "var(--blue)" }}>
                Privacy Notice
              </Link>.
            </p>
          </div>
        </article>

        {/* Back and Related Links */}
        <div className={styles.backBar}>
          <Link href="/intro" className={styles.navLink}>
            ← Back to Margins Guide
          </Link>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/privacy" className={styles.navLink}>
              Privacy Notice →
            </Link>
            <Link href="/signup" className={styles.navLink}>
              Join Division A →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
