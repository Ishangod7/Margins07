"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type Me, type Profile } from "@/lib/api";
import styles from "@/app/settings/settings.module.css";
import peopleStyles from "@/app/people/people.module.css";

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SettingsManager({
  initialMe,
  token,
}: {
  initialMe: Me;
  token: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "privacy" | "data">("profile");

  const profile = initialMe.profile;

  // Profile Form State
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [skillsStr, setSkillsStr] = useState((profile?.skills ?? []).join(", "));
  const [interestsStr, setInterestsStr] = useState((profile?.interests ?? []).join(", "));
  const [canHelpStr, setCanHelpStr] = useState((profile?.can_help_with ?? []).join(", "));
  const [learningStr, setLearningStr] = useState((profile?.currently_learning ?? []).join(", "));

  // Privacy Form State
  const [showBio, setShowBio] = useState(profile?.show_bio ?? true);
  const [showSkills, setShowSkills] = useState(profile?.show_skills ?? true);
  const [showInterests, setShowInterests] = useState(profile?.show_interests ?? true);
  const [showContributions, setShowContributions] = useState(profile?.show_contributions ?? true);

  // Status
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derived arrays for live preview
  const liveSkills = skillsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const liveCanHelp = canHelpStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setBusy(true);

    try {
      await apiFetch<Profile>("/me/profile", token, {
        method: "PATCH",
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim(),
          skills: liveSkills,
          interests: interestsStr.split(",").map((s) => s.trim()).filter(Boolean),
          can_help_with: liveCanHelp,
          currently_learning: learningStr.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });

      setSuccess("Profile updated successfully!");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Could not update profile");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePrivacy(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setBusy(true);

    try {
      await apiFetch<Profile>("/me/privacy", token, {
        method: "PATCH",
        body: JSON.stringify({
          show_bio: showBio,
          show_skills: showSkills,
          show_interests: showInterests,
          show_contributions: showContributions,
        }),
      });

      setSuccess("Privacy settings saved!");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Could not save privacy settings");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportData() {
    setBusy(true);
    setSuccess(null);
    setError(null);
    try {
      const data = await apiFetch<any>("/me/export", token);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `margins-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("Your personal data export was downloaded successfully.");
    } catch (err: any) {
      setError("Could not export data: " + (err?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmation = prompt(
      'Permanent Account Deletion (DPDP Act):\n\nThis will permanently erase your profile, membership, and bookmark records from Margins. This action cannot be undone.\n\nType "DELETE" to confirm:'
    );
    if (confirmation !== "DELETE") {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiFetch("/me/account", token, { method: "DELETE" });
      const supabase = createClient();
      await supabase.auth.signOut();
      alert("Your Margins account and personal data have been completely erased.");
      router.push("/intro");
    } catch (err: any) {
      setError("Could not delete account: " + (err?.message || "Unknown error"));
      setBusy(false);
    }
  }

  async function handleSignOut() {
    if (!confirm("Are you sure you want to sign out?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div>
      {/* Tab Switcher */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabBtnActive : ""}`}
          onClick={() => { setActiveTab("profile"); setSuccess(null); setError(null); }}
        >
          Student Profile
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "privacy" ? styles.tabBtnActive : ""}`}
          onClick={() => { setActiveTab("privacy"); setSuccess(null); setError(null); }}
        >
          Privacy Controls
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "data" ? styles.tabBtnActive : ""}`}
          onClick={() => { setActiveTab("data"); setSuccess(null); setError(null); }}
        >
          Account & Data
        </button>
      </div>

      {success && <div className={styles.successMessage}>{success}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Tab 1: Profile Editor */}
      {activeTab === "profile" && (
        <div className={styles.settingsGrid}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>edit student profile</h2>
            <p className={styles.formDesc}>
              Tell your AI&DS Division A classmates about yourself, your skills, and what you can help with.
            </p>

            <form onSubmit={handleSaveProfile}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Display Name</label>
                <input
                  className={styles.inputField}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="e.g. Ishan Gupta"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Short Bio</label>
                <textarea
                  className={`${styles.inputField} ${styles.textareaField}`}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  placeholder="A quick note about your focus, hobbies, or current projects..."
                />
                <span className={styles.formHint}>Max 300 characters ({bio.length}/300)</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Skills & Tools (Comma-Separated)</label>
                <input
                  className={styles.inputField}
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  placeholder="e.g. Python, PyTorch, React, SQL, Pandas"
                />
                <span className={styles.formHint}>Used for directory search tags</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Interests & Passions (Comma-Separated)</label>
                <input
                  className={styles.inputField}
                  value={interestsStr}
                  onChange={(e) => setInterestsStr(e.target.value)}
                  placeholder="e.g. Computer Vision, Hackathons, Chess, Open Source"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Can Help Peers With (Comma-Separated)</label>
                <input
                  className={styles.inputField}
                  value={canHelpStr}
                  onChange={(e) => setCanHelpStr(e.target.value)}
                  placeholder="e.g. Linear Algebra, Physics Optics, Python, C / C++"
                />
                <span className={styles.formHint}>Helpful for study groups and doubt solving</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Currently Learning (Comma-Separated)</label>
                <input
                  className={styles.inputField}
                  value={learningStr}
                  onChange={(e) => setLearningStr(e.target.value)}
                  placeholder="e.g. Transformer Models, Next.js 16, Rust"
                />
              </div>

              <button type="submit" className="btn yellow" disabled={busy}>
                {busy ? "Saving Changes..." : "Save Profile →"}
              </button>
            </form>
          </div>

          {/* Side Panel: Live Preview Card */}
          <div className={styles.previewPanel}>
            <div className={styles.previewHeader}>live classmate card preview</div>
            <div className={peopleStyles.personCard} style={{ transform: "rotate(0.5deg)" }}>
              <div className={peopleStyles.cardHead}>
                <div
                  className={`${peopleStyles.avatarCircle} ${
                    profile?.role === "cr" ? peopleStyles.avatarCR : peopleStyles.avatarSelf
                  }`}
                >
                  {makeInitials(displayName || "Your Name")}
                </div>
                <div className={peopleStyles.cardHeadInfo}>
                  <div className={peopleStyles.nameRow}>
                    <span className={peopleStyles.personName}>{displayName || "Your Name"}</span>
                    {profile?.role === "cr" && <span className={`${peopleStyles.roleBadge} ${peopleStyles.roleCR}`}>CR</span>}
                    <span className={peopleStyles.selfBadge}>YOU</span>
                  </div>
                </div>
              </div>

              <p className={bio ? peopleStyles.bioText : peopleStyles.bioEmpty}>
                {bio || "Keeping things quiet"}
              </p>

              {liveSkills.length > 0 && (
                <div className={peopleStyles.pillRow}>
                  {liveSkills.slice(0, 4).map((sk, idx) => (
                    <span key={idx} className={peopleStyles.skillPill}>
                      #{sk}
                    </span>
                  ))}
                  {liveSkills.length > 4 && (
                    <span className={peopleStyles.skillPill}>+{liveSkills.length - 4}</span>
                  )}
                </div>
              )}

              {liveCanHelp.length > 0 && (
                <div className={peopleStyles.helpBox}>
                  <span>Helps with:</span>
                  <strong>{liveCanHelp.slice(0, 2).join(", ")}</strong>
                </div>
              )}

              <div className={peopleStyles.cardFooter}>
                <span>TCET Mumbai</span>
                <span className={peopleStyles.viewProfileLink}>view profile →</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Privacy Controls */}
      {activeTab === "privacy" && (
        <div style={{ maxWidth: "680px" }}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>privacy & visibility controls</h2>
            <p className={styles.formDesc}>
              Control exactly what details your classmates see. You can change these toggles anytime.
            </p>

            <form onSubmit={handleSavePrivacy}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <h4>Show Bio on Public Profile</h4>
                  <p>When turned off, classmates see a friendly placeholder instead of your written bio.</p>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={showBio}
                    onChange={(e) => setShowBio(e.target.checked)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <h4>Show Skills Tags</h4>
                  <p>Allows classmates searching for specific skills (e.g. Python, Linear Algebra) to discover you.</p>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={showSkills}
                    onChange={(e) => setShowSkills(e.target.checked)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <h4>Show Interests</h4>
                  <p>Displays your personal interests on your detailed profile page.</p>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={showInterests}
                    onChange={(e) => setShowInterests(e.target.checked)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <h4>Show Contribution Stats</h4>
                  <p>Displays counts of notes/resources shared and doubts answered on your card.</p>
                </div>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={showContributions}
                    onChange={(e) => setShowContributions(e.target.checked)}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div style={{ marginTop: "20px" }}>
                <button type="submit" className="btn yellow" disabled={busy}>
                  {busy ? "Saving..." : "Save Privacy Settings"}
                </button>
              </div>
            </form>

            <div className={styles.guaranteeBox}>
              <h4>what classmates never see</h4>
              <p>
                Your login email, password, session timestamps, and saved resources are strictly private. Margins has zero ads, no third-party tracking, and is exclusive to Division A.
              </p>
              <div style={{ marginTop: "10px", fontSize: "12px", display: "flex", gap: "14px" }}>
                <Link href="/privacy" style={{ textDecoration: "underline", color: "var(--blue)" }}>
                  Read Privacy Notice (DPDP Act) →
                </Link>
                <Link href="/terms" style={{ textDecoration: "underline", color: "var(--blue)" }}>
                  Terms of Use →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Account & Data */}
      {activeTab === "data" && (
        <div style={{ maxWidth: "680px" }}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>account & data export</h2>
            <p className={styles.formDesc}>
              Manage your Margins account data and download an offline copy anytime.
            </p>

            <div style={{ marginBottom: "20px", fontSize: "13.5px", lineHeight: "1.8", color: "var(--ink)" }}>
              <div><strong>Account Email:</strong> {initialMe.email}</div>
              <div><strong>Class Cohort:</strong> TCET Mumbai — AI&DS Division A</div>
              <div><strong>Role:</strong> {profile?.role === "cr" ? "Class Representative (CR)" : "Member"}</div>
            </div>

            <div style={{ borderTop: "1.5px dashed rgba(37,36,31,0.2)", paddingTop: "18px", marginBottom: "22px" }}>
              <h3 style={{ fontFamily: "Patrick Hand, cursive", fontSize: "18px", marginBottom: "6px" }}>
                download my data (dpdp data portability)
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--ink-soft)", marginBottom: "12px" }}>
                Download a complete, machine-readable JSON archive of your profile, memberships, uploaded notes, doubts, and solutions in accordance with India's DPDP Act 2023.
              </p>
              <button
                type="button"
                className="btn small"
                onClick={handleExportData}
                disabled={busy}
              >
                {busy ? "Exporting Data..." : "Export My Margins Data (.json)"}
              </button>
            </div>

            <div style={{ borderTop: "1.5px dashed rgba(37,36,31,0.2)", paddingTop: "18px", marginBottom: "22px" }}>
              <h3 style={{ fontFamily: "Patrick Hand, cursive", fontSize: "18px", marginBottom: "6px" }}>
                session management
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--ink-soft)", marginBottom: "12px" }}>
                Sign out of Margins on this browser.
              </p>
              <button
                type="button"
                className="btn small"
                style={{ background: "var(--paper-dark)", borderColor: "var(--border)" }}
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>

            <div style={{ borderTop: "1.5px dashed rgba(37,36,31,0.2)", paddingTop: "18px" }}>
              <h3 style={{ fontFamily: "Patrick Hand, cursive", fontSize: "18px", marginBottom: "6px", color: "var(--red)" }}>
                delete account (right to erasure)
              </h3>
              <p style={{ fontSize: "12.5px", color: "var(--ink-soft)", marginBottom: "12px" }}>
                Permanently purge your account, profile, class memberships, and bookmarks from the database. This action is irreversible and honors your statutory right to erasure under the DPDP Act 2023.
              </p>
              <button
                type="button"
                className="btn small"
                style={{ background: "#fff2f2", borderColor: "#e05252", color: "#ab3f38" }}
                onClick={handleDeleteAccount}
                disabled={busy}
              >
                Permanently Delete My Margins Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
