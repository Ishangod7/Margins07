"use client";

import { useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, display_name: displayName, invite_code: inviteCode }),
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

    // account created server-side — now sign in on the client to get a session
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
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
        <h1 className={styles.title}>join the margins</h1>
        <p className={styles.sub}>you'll need the invite code from your CR</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            placeholder="your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className={styles.passWrap}>
            <input
              className={`${styles.input} ${styles.passInput}`}
              type={showPassword ? "text" : "password"}
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className={styles.passToggle}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              tabIndex={0}
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
          <input
            className={styles.input}
            placeholder="invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
          />

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.button} disabled={loading} type="submit">
            {loading ? "creating account..." : "enter margins →"}
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
