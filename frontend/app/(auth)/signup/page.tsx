"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { API_URL } from "@/lib/api";

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
    <main className="dh-page">
      <div className="dh-card">
        <div className="dh-top-bar">
          <Link href="/intro" className="dh-brand-link">
            <span className="dh-wordmark-m">M</span>argins
          </Link>
          <span className="dh-tag">DIV A · TCET</span>
        </div>
        <h1 className="dh-title">join the margins <span className="dh-title-mark">✎</span></h1>
        <p className="dh-sub">you'll need the invite code from your CR</p>

        <form onSubmit={handleSubmit} className="dh-form">
          <input
            className="dh-input"
            placeholder="your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <input
            className="dh-input"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="dh-pass-wrap">
            <input
              className="dh-input dh-pass-input"
              type={showPassword ? "text" : "password"}
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="dh-pass-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              tabIndex={0}
            >
              {showPassword ? (
                // eye-off icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.5 20.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                // eye icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <input
            className="dh-input"
            placeholder="invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
          />

          {error && <p className="dh-error">{error}</p>}

          <button className="dh-button" disabled={loading} type="submit">
            {loading ? "creating account..." : "enter margins →"}
          </button>
        </form>

        <div className="dh-links-wrap">
          <p className="dh-switch-text">
            Already have an account?{" "}
            <Link href="/login" className="dh-link-highlight">
              Log in here →
            </Link>
          </p>
          <div className="dh-divider">
            <span>or</span>
          </div>
          <Link href="/intro" className="dh-intro-link">
            ✎ New here? Read what Margins is for & guide
          </Link>
        </div>
      </div>

      <style jsx global>{`
        body {
          font-family: "DM Sans", sans-serif;
          color: #292721;
          background:
            radial-gradient(circle at 20% 15%, rgba(255,255,255,.55), transparent 25%),
            radial-gradient(circle at 85% 70%, rgba(130,90,40,.08), transparent 25%),
            radial-gradient(rgba(90,65,35,.09) 1px, transparent 1px);
          background-size: auto, auto, 9px 9px;
          background-color: #e9dcc3;
        }
      `}</style>
      <style jsx>{`
        .dh-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 20px;
        }
        .dh-card {
          width: 100%;
          max-width: 420px;
          padding: 32px 28px;
          background: rgba(255, 253, 243, 0.92);
          border: 2px solid #282722;
          box-shadow: 6px 7px 0 #282722;
          transform: rotate(-0.3deg);
        }
        .dh-wordmark {
          font-family: "DM Sans", sans-serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #59564f;
          margin-bottom: 14px;
        }
        .dh-wordmark-m {
          font-family: "Caveat", cursive;
          font-weight: 700;
          font-size: 26px;
          color: #345f9e;
          margin-right: 1px;
          text-transform: none;
          letter-spacing: 0;
        }
        .dh-title {
          font-family: "Caveat", cursive;
          font-size: 42px;
          line-height: 0.9;
          margin-bottom: 6px;
        }
        .dh-title-mark {
          font-family: "DM Sans", sans-serif;
          font-size: 22px;
          vertical-align: middle;
          display: inline-block;
        }
        .dh-pass-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .dh-pass-input {
          width: 100%;
          padding-right: 44px;
        }
        .dh-pass-toggle {
          position: absolute;
          right: 10px;
          display: grid;
          place-items: center;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #59564f;
        }
        .dh-pass-toggle:hover {
          color: #282722;
        }
        .dh-pass-toggle:focus-visible {
          outline: 2px solid #345f9e;
          outline-offset: 2px;
          border-radius: 3px;
        }
        .dh-sub {
          font-size: 13px;
          color: #59564f;
          margin-bottom: 20px;
        }
        .dh-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dh-input {
          padding: 11px 14px;
          border: 2px solid #282722;
          background: #fffdf3;
          font-family: "DM Sans", sans-serif;
          font-size: 14px;
        }
        .dh-button {
          margin-top: 6px;
          padding: 12px;
          border: 2px solid #282722;
          background: #efd477;
          box-shadow: 3px 3px 0 #282722;
          font-family: "Patrick Hand", cursive;
          font-size: 17px;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .dh-button:hover {
          transform: translate(1px, 1px);
          box-shadow: 2px 2px 0 #282722;
        }
        .dh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .dh-error {
          font-size: 12px;
          color: #d74b42;
          font-weight: 500;
        }
        .dh-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .dh-brand-link {
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: .14em;
          text-transform: uppercase;
          color: #59564f;
        }
        .dh-tag {
          font-family: "Patrick Hand", cursive;
          font-size: 13px;
          color: #345f9e;
          background: #dce8f4;
          border: 1.5px solid #282722;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .dh-links-wrap {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1.5px dashed rgba(40, 39, 34, 0.25);
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .dh-switch-text {
          font-size: 13px;
          color: #59564f;
        }
        .dh-link-highlight {
          color: #345f9e;
          font-weight: 700;
          text-decoration: none;
          border-bottom: 1.5px solid #345f9e;
          padding-bottom: 1px;
        }
        .dh-link-highlight:hover {
          color: #204175;
          border-color: #204175;
        }
        .dh-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin: 4px 0;
        }
        .dh-divider span {
          background: #fffdf5;
          padding: 0 8px;
          font-family: "Patrick Hand", cursive;
          font-size: 13px;
          color: #8e8b81;
        }
        .dh-intro-link {
          font-family: "Patrick Hand", cursive;
          font-size: 15px;
          color: #49463e;
          text-decoration: none;
          background: #fbf6e3;
          border: 1.5px solid #282722;
          padding: 6px 12px;
          border-radius: 6px;
          box-shadow: 2px 2px 0 #282722;
          transition: all 0.15s ease;
        }
        .dh-intro-link:hover {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0 #282722;
          background: #f5eed0;
        }
      `}</style>
    </main>
  );
}
