"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import styles from "@/app/notices/notices.module.css";

const CATEGORIES = ["Academic", "Deadline", "Exam", "Assignment", "General", "Important"];

async function token() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

export function NoticeComposer() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true); setError(null);
    try {
      await apiFetch("/notices", await token(), {
        method: "POST",
        body: JSON.stringify({
          title: String(fd.get("title") ?? ""),
          content: String(fd.get("content") ?? ""),
          category: String(fd.get("category") ?? "General"),
        }),
      });
      form.reset();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className={styles.composer}>
      <summary className={styles.composerToggle}>+ new notice</summary>
      <form onSubmit={onSubmit} className={`card ${styles.form}`}>
        <input className="input" name="title" placeholder="title" required />
        <select className="select" name="category" defaultValue="General">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <textarea className="textarea" name="content" placeholder="what's the notice?" required />
        {error && <p className={styles.danger}>{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "posting…" : "post notice"}</button>
      </form>
    </details>
  );
}

export function NoticeActions({ id, pinned }: { id: string; pinned: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); router.refresh(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className={styles.cardActions}>
      <button className={styles.linkBtn} disabled={busy}
        onClick={() => run(async () => apiFetch(`/notices/${id}/pin`, await token(), { method: "PATCH" }))}>
        {pinned ? "unpin" : "pin"}
      </button>
      <button className={`${styles.linkBtn} ${styles.danger}`} disabled={busy}
        onClick={() => { if (confirm("Delete this notice?")) run(async () => apiFetch(`/notices/${id}`, await token(), { method: "DELETE" })); }}>
        delete
      </button>
    </div>
  );
}
