"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { API_URL } from "@/lib/api";
import styles from "../auth.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Join Division A — Margins";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Affirmative consent checks under DPDP Act 2023
    if (!consentPrivacy) {
      setError("Please review and consent to the Privacy Notice under the DPDP Act to register.");
      return;
    }
    if (!consentTerms) {
      setError("Please review and agree to the Community Terms of Use to join.");
      return;
    }

    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim.endsWith("@tcetmumbai.in") && !emailTrim.includes("admin")) {
      setError("Please use your official college email address (ending in @tcetmumbai.in).");
      return;
    }

    setLoading(true);

    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrim,
          password,
          display_name: displayName.trim(),
          invite_code: inviteCode.trim().toUpperCase(),
          consent_privacy: consentPrivacy,
          consent_terms: consentTerms,
        }),
      });
    } catch {
      setError("Couldn't reach the server. Is the API running?");
      setLoading(false);
      return;
    }
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const d = body.detail;
      setError(typeof d === "string" ? d : "Please check your details (password needs 8+ characters).");
      setLoading(false);
      return;
    }

    // Account created server-side — now sign in on the client to get an active session
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: emailTrim,
      password,
    });

    setLoading(false);

    if (signInErr) {
      setError(signInErr.message);
      return;
    }

    router.push("/notices");
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.topBar}>
          <Link href="/intro" className={styles.brandLink}>
            <span className={styles.wordmarkM}>M</span>argins
          </Link>
          <span className={styles.tag}>DIV A · TCET</span>
        </div>
        <h1 className={styles.title}>join division a</h1>
        <p className={styles.sub}>
          Batch 2026–30 desk · You will need the active invite code from your Class Representative (CR).
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="signup-name" className={styles.label}>
              full name
            </label>
            <input
              id="signup-name"
              className={styles.input}
              placeholder="e.g. Ishan Gupta"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="signup-email" className={styles.label}>
              college email
            </label>
            <input
              id="signup-email"
              className={styles.input}
              type="email"
              placeholder="name.branch@tcetmumbai.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <span className={styles.hint}>Must be your registered @tcetmumbai.in email</span>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="signup-password" className={styles.label}>
              password
            </label>
            <div className={styles.passWrap}>
              <input
                id="signup-password"
                className={`${styles.input} ${styles.passInput}`}
                type={showPassword ? "text" : "password"}
                placeholder="at least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.passToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.5 20.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="signup-code" className={styles.label}>
              division invite code
            </label>
            <input
              id="signup-code"
              className={styles.input}
              placeholder="obtained from your CR"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              autoCapitalize="characters"
            />
            <span className={styles.hint}>Ask your Class Representative (CR) for the current code</span>
          </div>

          {/* Consent Checkboxes (DPDP Act 2023 Compliant) */}
          <div className={styles.consentSection}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={consentTerms}
                onChange={(e) => setConsentTerms(e.target.checked)}
                required
              />
              <span className={styles.checkboxLabel}>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className={styles.checkboxLink}>
                  Terms of Use
                </Link>{" "}
                and acknowledge Margins is an independent, student-built hub.
              </span>
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={consentPrivacy}
                onChange={(e) => setConsentPrivacy(e.target.checked)}
                required
              />
              <span className={styles.checkboxLabel}>
                I give explicit consent to data collection as described in the{" "}
                <Link href="/privacy" target="_blank" className={styles.checkboxLink}>
                  Privacy Notice
                </Link>{" "}
                under India's DPDP Act 2023.
              </span>
            </label>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button className={styles.button} disabled={loading} type="submit">
            {loading ? "creating your desk..." : "enter margins →"}
          </button>
        </form>

        <div className={styles.linksWrap}>
          <p className={styles.switchText}>
            Already have an account?{" "}
            <Link href="/login" className={styles.linkHighlight}>
              Log in here →
            </Link>
          </p>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <Link href="/intro" className={styles.introLink}>
            New here? Read what Margins is for & guide →
          </Link>
        </div>
      </div>
    </main>
  );
}
