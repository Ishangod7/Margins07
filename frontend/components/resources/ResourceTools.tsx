"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, API_URL } from "@/lib/api";
import {
  ResourceIcon,
  DocIcon,
  StarIcon,
  CrossIcon,
  CheckIcon,
} from "@/components/ui/Icons";
import styles from "@/app/resources/resources.module.css";

export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  resource_count: number;
}

export interface ResourceItem {
  id: string;
  title: string;
  description?: string;
  kind: string;
  subject_id?: string;
  subject?: { id: string; name: string; code?: string };
  unit?: string;
  tags?: string[];
  file_name?: string;
  file_size?: number;
  external_url?: string;
  download_count: number;
  save_count: number;
  is_saved: boolean;
  author_name?: string;
  created_by: string;
  created_at: string;
}

async function getAccessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

export function ResourceUploadModal({
  subjects,
  isOpen,
  onClose,
}: {
  subjects: SubjectItem[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [kind, setKind] = useState("notes");
  const [unit, setUnit] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please log in to upload resources");

      if (tab === "link") {
        if (!externalUrl.startsWith("https://")) {
          throw new Error("Link must start with https://");
        }
        await apiFetch("/resources", token, {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            subject_id: subjectId || null,
            kind: "link",
            unit: unit.trim() || null,
            external_url: externalUrl.trim(),
          }),
        });
      } else {
        if (!file) throw new Error("Please select a file to upload");
        if (file.size > 25 * 1024 * 1024) throw new Error("File must be smaller than 25 MB");

        // 1. Get signed upload URL
        const uploadRes = await apiFetch<{ upload_url: string; file_path: string }>(
          "/resources/upload-url",
          token,
          {
            method: "POST",
            body: JSON.stringify({
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type || "application/octet-stream",
            }),
          }
        );

        // 2. Upload file directly to Supabase storage
        const putResp = await fetch(uploadRes.upload_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!putResp.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // 3. Finalize resource in database
        await apiFetch("/resources", token, {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            subject_id: subjectId || null,
            kind: kind === "link" ? "notes" : kind,
            unit: unit.trim() || null,
            file_path: uploadRes.file_path,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          }),
        });
      }

      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`card ${styles.modalCard}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>add resource to shelf</h3>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close">
            <CrossIcon size={16} />
          </button>
        </div>

        <div className={styles.modalTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === "file" ? styles.tabBtnActive : ""}`}
            onClick={() => { setTab("file"); setKind("notes"); }}
          >
            Upload File (PDF, Notes, PYQ)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === "link" ? styles.tabBtnActive : ""}`}
            onClick={() => { setTab("link"); setKind("link"); }}
          >
            Share Link (Video, Website)
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div>
            <label className={styles.label}>Title</label>
            <input
              className="input"
              placeholder="e.g. DBMS Unit 3 Normalization Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <div className={styles.formRow}>
            <div>
              <label className={styles.label}>Subject</label>
              <select
                className="select"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `[${s.code}] ` : ""}{s.name}
                  </option>
                ))}
              </select>
            </div>

            {tab === "file" && (
              <div>
                <label className={styles.label}>Category</label>
                <select
                  className="select"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="notes">Notes</option>
                  <option value="pyq">PYQ (Past Paper)</option>
                  <option value="slides">Slides / Presentation</option>
                  <option value="book">Reference Book</option>
                  <option value="assignment">Assignment Solution</option>
                  <option value="other">Other Material</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className={styles.label}>Module / Unit (Optional)</label>
            <input
              className="input"
              placeholder="e.g. Unit 2 or Module 4"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          {tab === "file" ? (
            <div>
              <label className={styles.label}>Select File (Max 25 MB)</label>
              <input
                type="file"
                className="input"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
          ) : (
            <div>
              <label className={styles.label}>Web Link (https://...)</label>
              <input
                type="url"
                className="input"
                placeholder="https://youtube.com/... or https://nptel..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className={styles.label}>Description (Optional)</label>
            <textarea
              className="textarea"
              placeholder="Brief details about what is covered in this resource..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.modalActions}>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn yellow" disabled={busy}>
              {busy ? "Saving..." : "Add to Shelf →"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export function ResourceCard({
  resource,
  currentUserId,
  isCr,
}: {
  resource: ResourceItem;
  currentUserId?: string;
  isCr?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(resource.is_saved);
  const [saveCount, setSaveCount] = useState(resource.save_count);
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState(false);

  const canDelete = isCr || (currentUserId && resource.created_by === currentUserId);

  async function handleToggleSave() {
    try {
      const token = await getAccessToken();
      if (!token) return;
      // Optimistic update
      setSaved(!saved);
      setSaveCount(saved ? Math.max(0, saveCount - 1) : saveCount + 1);

      const res = await apiFetch<{ is_saved: boolean; save_count: number }>(
        `/resources/${resource.id}/save`,
        token,
        { method: "POST" }
      );
      setSaved(res.is_saved);
      setSaveCount(res.save_count);
    } catch {
      // Revert on error
      setSaved(saved);
      setSaveCount(saveCount);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please log in to download");

      const res = await apiFetch<{ download_url: string; kind: string }>(
        `/resources/${resource.id}/download`,
        token
      );
      if (res.download_url) {
        window.open(res.download_url, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      alert(e.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this resource from the shelf?")) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await apiFetch(`/resources/${resource.id}`, token, { method: "DELETE" });
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card ${styles.resourceCard}`}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={styles.typeBadge}>{resource.kind.toUpperCase()}</span>
          {resource.subject?.code && (
            <span className={styles.subjectBadge}>{resource.subject.code}</span>
          )}
          {resource.unit && <span className={styles.unitBadge}>{resource.unit}</span>}
        </div>

        <button
          type="button"
          onClick={handleToggleSave}
          className={`${styles.saveBtn} ${saved ? styles.savedActive : ""}`}
          title={saved ? "Saved to your bookmarks" : "Save to bookmarks"}
          aria-label={saved ? "Unsave resource" : "Save resource"}
        >
          <StarIcon size={14} />
          <span>{saveCount}</span>
        </button>
      </div>

      <h4 className={styles.cardTitle}>{resource.title}</h4>
      {resource.description && (
        <p className={styles.cardDesc}>{resource.description}</p>
      )}

      <div className={styles.cardBottom}>
        <div className={styles.uploaderInfo}>
          <span>{resource.author_name ?? "Classmate"}</span>
          {resource.file_size ? (
            <small>• {(resource.file_size / (1024 * 1024)).toFixed(1)} MB</small>
          ) : null}
        </div>

        <div className={styles.cardActions}>
          {canDelete && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={busy}
              title="Delete resource"
            >
              delete
            </button>
          )}
          <button
            type="button"
            className="btn small yellow"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? "Opening…" : resource.kind === "link" ? "Open Link ↗" : "Download ⤓"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShelfHeaderActions({
  subjects,
}: {
  subjects: SubjectItem[];
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn yellow"
        onClick={() => setModalOpen(true)}
      >
        + Add Resource
      </button>

      <ResourceUploadModal
        subjects={subjects}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
