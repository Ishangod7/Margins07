import type { Metadata } from "next";
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy Notice — Margins",
  description:
    "Plain-language privacy notice for Margins under India's Digital Personal Data Protection (DPDP) Act 2023 and Rules 2025.",
};

export default function PrivacyPage() {
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
              DPDP ACT 2023 & RULES 2025 COMPLIANT
            </span>
            <span className={styles.pill}>STUDENT HUB · DIVISION A</span>
          </div>

          <h1 className={styles.title}>privacy notice</h1>
          <p className={styles.subtitle}>
            A plain-language explanation of how student personal data is collected, used,
            protected, and deleted on Margins. No hidden fine print.
          </p>

          <div className={styles.metaInfo}>
            <div>
              <strong>Last Updated:</strong> October 25, 2026
            </div>
            <div>
              <strong>Applicable Cohort:</strong> TCET Mumbai · AI&DS Batch 2026–30
            </div>
            <div>
              <strong>Data Fiduciary:</strong> Student-Run Class Hub (CR Ishan Gupta)
            </div>
          </div>

          {/* §1: Who Runs Margins */}
          <section className={styles.section}>
            <h2>1. Who runs Margins & how to reach us</h2>
            <p>
              Margins is an independent, non-commercial, student-built academic study desk
              created exclusively for the students of Thakur College of Engineering and Technology
              (TCET Mumbai), Department of Artificial Intelligence & Data Science, Division A (Batch 2026–30).
            </p>
            <p>
              The platform is maintained by the elected Class Representative (CR) and student administrators.
              If you have any questions, wish to exercise your statutory data rights, or have a privacy request,
              contact:
            </p>
            <div className={styles.highlightBox}>
              <strong>Data Privacy & Grievance Contact:</strong>
              <div>Ishan Gupta (Class Representative, AI&DS Division A)</div>
              <div>Official College Email: ishan.gupta.aids@tcetmumbai.in</div>
              <div>Internal Desk Channel: Margins Settings → Support / CR Desk</div>
              <div>Turnaround Commitment: Inquiries answered within 48 hours.</div>
            </div>
          </section>

          {/* §2: What Data is Collected & Why */}
          <section className={styles.section}>
            <h2>2. What personal data is collected and why</h2>
            <p>
              We adhere strictly to the data minimization principle mandated under Section 6 of the
              Digital Personal Data Protection Act 2023. We only collect information essential for operating
              a closed academic desk:
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.legalTable}>
                <thead>
                  <tr>
                    <th>Item Collected</th>
                    <th>Source</th>
                    <th>Specific Purpose</th>
                    <th>Legal Basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>College Email</strong></td>
                    <td>Provided at signup</td>
                    <td>Identity authentication & verifying membership in TCET AI&DS Division A</td>
                    <td>Explicit Consent</td>
                  </tr>
                  <tr>
                    <td><strong>Display Name</strong></td>
                    <td>Provided at signup</td>
                    <td>Attributing doubts, answers, and shared study notes to classmates</td>
                    <td>Explicit Consent</td>
                  </tr>
                  <tr>
                    <td><strong>Password (Hashed)</strong></td>
                    <td>Provided at signup</td>
                    <td>Account security (hashed using bcrypt via Supabase Auth; never plaintext)</td>
                    <td>Security necessity</td>
                  </tr>
                  <tr>
                    <td><strong>Profile Info (Bio, Skills, Interests)</strong></td>
                    <td>Optional in Settings</td>
                    <td>Peer study groups, hackathon team formation, and skill matching</td>
                    <td>Opt-in Consent</td>
                  </tr>
                  <tr>
                    <td><strong>Academic Doubts & Answers</strong></td>
                    <td>Posted by user</td>
                    <td>Classroom peer doubt-resolution archive for examination revision</td>
                    <td>User Submission</td>
                  </tr>
                  <tr>
                    <td><strong>Uploaded Resources & Notes</strong></td>
                    <td>Uploaded by user</td>
                    <td>Shared Resource Shelf (PYQs, reference notes, lab experiment guides)</td>
                    <td>User Submission</td>
                  </tr>
                  <tr>
                    <td><strong>Invite Code</strong></td>
                    <td>Entered at signup</td>
                    <td>Verifying eligibility to enter the private Division A roster</td>
                    <td>Access control</td>
                  </tr>
                  <tr>
                    <td><strong>Session Logs & Timestamps</strong></td>
                    <td>Server generated</td>
                    <td>Session maintenance, security auditing, and rate-limiting abuse prevention</td>
                    <td>Legitimate Use</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* §3: Who Can See What & Faculty Safeguards */}
          <section className={styles.section}>
            <h2>3. Who can see your information (access boundaries)</h2>
            <p>
              Margins is architected with strict boundary isolation:
            </p>
            <ul>
              <li>
                <strong>Classmates in Division A:</strong> Can see your display name, questions asked on the
                Doubt Board, answers, shared notes, and any profile fields you have explicitly toggled visible
                in your Privacy Controls.
              </li>
              <li>
                <strong>Class Representative / Student Admins:</strong> Have administrative access only to moderate
                academic content, rotate invite codes, and resolve student disputes.
              </li>
              <li>
                <strong>Zero Faculty or Administration Access:</strong> College professors, teachers, HOD, and
                institutional administrators have zero access, zero accounts, and zero oversight into Margins.
              </li>
              <li>
                <strong>No Marks or Attendance Surveillance:</strong> Margins will never track, store, or display
                academic marks, internal assessments, KT status, attendance logs, or disciplinary records.
              </li>
            </ul>
          </section>

          {/* §4: Infrastructure & Storage Locations */}
          <section className={styles.section}>
            <h2>4. Where your data lives & how it is secured</h2>
            <p>
              Your data is stored with industry-standard cloud infrastructure partners:
            </p>
            <ul>
              <li>
                <strong>Database & Authentication:</strong> Supabase Cloud (PostgreSQL with Row Level Security enabled
                on all application tables). All database connections enforce TLS 1.3 encryption in transit and AES-256 at rest.
              </li>
              <li>
                <strong>Frontend Application:</strong> Vercel Edge Network with automated HTTPS, HTTP Strict Transport Security
                (HSTS), and restrictive Content Security Policies.
              </li>
              <li>
                <strong>Backend API:</strong> Hosted in Singapore (AWS ap-southeast-1 region) with strict CORS filtering.
              </li>
            </ul>
          </section>

          {/* §5: Data Retention & Graduation Purge */}
          <section className={styles.section}>
            <h2>5. Data retention & account life cycle</h2>
            <p>
              Personal data is maintained only for as long as needed to support your studies in TCET AI&DS Division A:
            </p>
            <ul>
              <li>
                <strong>Active Semesters:</strong> Accounts remain active across Semesters 1 through 8 (Academic Years 2026 to 2030).
              </li>
              <li>
                <strong>Upon Graduation:</strong> When Batch 2026–30 graduates in mid-2030, all personal profile records,
                auth identities, and personal credentials will be systematically purged from the production database.
              </li>
              <li>
                <strong>Upon Account Deletion:</strong> If you delete your account earlier via Settings, your personal identity,
                memberships, and bookmarks are removed immediately.
              </li>
            </ul>
          </section>

          {/* §6: Your Statutory Rights (DPDP Act) */}
          <section className={styles.section}>
            <h2>6. Your rights under the DPDP Act 2023</h2>
            <p>
              Under Chapter III of the Digital Personal Data Protection Act 2023, you hold the following statutory rights,
              all of which are actionable directly within Margins:
            </p>
            <ul>
              <li>
                <strong>Right to Access & Summary:</strong> You can view all personal details stored about you in
                the Settings desk at any time.
              </li>
              <li>
                <strong>Right to Correction & Updating:</strong> You can update your display name, bio, skills, and
                privacy preferences in real time via Settings → Student Profile.
              </li>
              <li>
                <strong>Right to Data Portability (Export):</strong> You can download a complete, machine-readable JSON copy
                of your profile, posted questions, answers, and bookmarks via Settings → Account & Data → Export My Margins Data.
              </li>
              <li>
                <strong>Right to Erasure (Deletion):</strong> You can permanently erase your account, profile, and personal records
                via Settings → Account & Data → Permanently Delete Account.
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Consent given at registration can be withdrawn at any point by deleting
                your account.
              </li>
            </ul>
          </section>

          {/* §7: Cookies & Browser Storage Disclosure */}
          <section className={styles.section}>
            <h2>7. Cookies and local browser storage disclosure</h2>
            <p>
              Margins does not use third-party tracking, advertising beacons, or analytics trackers.
              We only use strictly necessary browser storage required to keep you securely signed in:
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.legalTable}>
                <thead>
                  <tr>
                    <th>Storage Key</th>
                    <th>Category</th>
                    <th>Purpose</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>sb-*-auth-token</code></td>
                    <td>Strictly Necessary (Supabase Auth)</td>
                    <td>Keeps your academic session active across page transitions</td>
                    <td>Session / 7 Days</td>
                  </tr>
                  <tr>
                    <td><code>theme_preference</code></td>
                    <td>User Preference (Local Storage)</td>
                    <td>Remembers your high-contrast or paper display preference</td>
                    <td>Persistent</td>
                  </tr>
                  <tr>
                    <td><strong>Third-party Cookies</strong></td>
                    <td>Advertising / Analytics</td>
                    <td>None. Margins does not embed Google Analytics, Meta Pixel, or ads</td>
                    <td>Zero</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* §8: Protection of Minor / Age Notice */}
          <section className={styles.section}>
            <h2>8. Notice regarding age of users</h2>
            <p>
              Under Section 9 of the DPDP Act 2023, an individual who has not completed eighteen years of age is considered a child.
              First-year engineering students enrolling in TCET Mumbai may be seventeen years of age upon admission.
            </p>
            <p>
              Margins is strictly an educational student peer desk. We do not engage in targeted advertising, behavioral tracking,
              or tracking that causes detrimental effects on well-being. Any student joining Margins under 18 confirms that their
              use is strictly for collegiate study in Division A and that their enrollment is supported by parental awareness of their
              academic program.
            </p>
          </section>

          {/* §9: Grievance Redressal & DPB Notice */}
          <section className={styles.section}>
            <h2>9. Grievance redressal & regulatory escalation</h2>
            <p>
              If you have any grievance or complaint regarding how your data is handled:
            </p>
            <ol style={{ paddingLeft: 20, lineHeight: 1.8, fontSize: "13.5px" }}>
              <li>
                <strong>First Step (Internal Resolution):</strong> Contact the Class Representative at{" "}
                <strong>ishan.gupta.aids@tcetmumbai.in</strong> or post an inquiry via Settings. We will investigate
                and respond within 48 hours.
              </li>
              <li>
                <strong>Statutory Escalation:</strong> If your grievance is not resolved to your satisfaction,
                you have the right under the DPDP Act 2023 to submit a complaint to the{" "}
                <strong>Data Protection Board of India (DPB)</strong> through its prescribed digital complaint portal.
              </li>
            </ol>
          </section>

          {/* Footer Notes */}
          <div className={styles.footerNotes}>
            <p>
              <strong>Disclaimer:</strong> Margins is an autonomous student initiative and is not an official organ
              of Thakur College of Engineering and Technology (TCET) or the University of Mumbai. This notice is provided
              to ensure transparency, safety, and mutual respect among classmates.
            </p>
            <p style={{ marginTop: 8 }}>
              Questions? Reach out to Ishan Gupta (CR) or your division student moderators.
            </p>
          </div>
        </article>

        {/* Back and Related Links */}
        <div className={styles.backBar}>
          <Link href="/intro" className={styles.navLink}>
            ← Back to Margins Guide
          </Link>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/terms" className={styles.navLink}>
              Terms of Use →
            </Link>
            <Link href="/signup" className={styles.navLink}>
              Create Student Account →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
