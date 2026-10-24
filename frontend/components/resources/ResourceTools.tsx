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
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
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

function getKindBadgeClass(kind: string) {
  switch (kind.toLowerCase()) {
    case "notes":
      return styles.badgeNotes;
    case "pyq":
      return styles.badgePyq;
    case "slides":
      return styles.badgeSlides;
    case "book":
      return styles.badgeBook;
    case "link":
      return styles.badgeLink;
    case "assignment":
      return styles.badgeAssignment;
    default:
      return styles.typeBadge;
  }
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
  const toast = useToast();
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

      toast.success("Resource added to the shelf!", "Resource Shared");
      onClose();
      router.refresh();
    } catch (err: any) {
      const msg = err.message || "Upload failed";
      setError(msg);
      toast.error(msg, "Upload Failed");
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
              placeholder="e.g. MATHS-I Unit 1 Differential Calculus Notes"
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
              {busy ? "Saving..." : "Add to Shelf"}
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
  const toast = useToast();
  const [saved, setSaved] = useState(resource.is_saved);
  const [saveCount, setSaveCount] = useState(resource.save_count);
  const [downloadCount, setDownloadCount] = useState(resource.download_count);
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const canDelete = isCr || (currentUserId && resource.created_by === currentUserId);

  async function handleToggleSave() {
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.info("Please log in to save bookmarks.", "Sign In Required");
        return;
      }
      const willSave = !saved;
      // Optimistic update
      setSaved(willSave);
      setSaveCount(willSave ? saveCount + 1 : Math.max(0, saveCount - 1));

      if (willSave) {
        toast.success("Saved to your study bookmarks!", "Bookmarked");
      } else {
        toast.info("Removed from study bookmarks.", "Bookmark Removed");
      }

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
      toast.error("Could not update bookmark. Please try again.");
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.info("Please log in to access resources.", "Sign In Required");
        return;
      }

      if (resource.kind === "link") {
        toast.info("Opening link in new tab...", "External Link");
      } else {
        toast.info("Starting download for " + resource.title + "...", "Downloading");
      }

      const res = await apiFetch<{ download_url: string; kind: string }>(
        `/resources/${resource.id}/download`,
        token
      );
      if (res.download_url) {
        setDownloadCount((prev) => prev + 1);
        window.open(res.download_url, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      toast.error(e.message || "Download failed. Please try again.", "Download Error");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyResource() {
    const textToCopy = resource.external_url
      ? resource.external_url
      : `[${resource.kind.toUpperCase()} - ${resource.subject?.code || "General"}] ${resource.title}${resource.unit ? ` (${resource.unit})` : ""}\n${window.location.origin}/resources?q=${encodeURIComponent(resource.title)}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Resource details copied to clipboard!", "Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this resource from the shelf?")) return;
    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      await apiFetch(`/resources/${resource.id}`, token, { method: "DELETE" });
      toast.success("Resource removed from shelf.", "Deleted");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Delete failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card ${styles.resourceCard}`}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={`${styles.typeBadge} ${getKindBadgeClass(resource.kind)}`}>
            {resource.kind.toUpperCase()}
          </span>
          {resource.subject?.code && (
            <span className={styles.subjectBadge}>{resource.subject.code}</span>
          )}
          {resource.unit && <span className={styles.unitBadge}>{resource.unit}</span>}
        </div>

        <div className={styles.topRightActions}>
          <button
            type="button"
            onClick={handleCopyResource}
            className={styles.copyBtn}
            title="Copy resource details and link"
            aria-label="Copy resource details"
          >
            <CopyIcon size={13} aria-hidden="true" />
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

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
          {downloadCount > 0 && (
            <span className={styles.dlBadge} title={`${downloadCount} downloads`}>
              <DownloadIcon size={11} aria-hidden="true" />
              <span>{downloadCount}</span>
            </span>
          )}
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
            {downloading ? (
              <span>Opening...</span>
            ) : resource.kind === "link" ? (
              <span className={styles.btnContent}>
                <ExternalLinkIcon size={13} aria-hidden="true" />
                <span>Open Link</span>
              </span>
            ) : (
              <span className={styles.btnContent}>
                <DownloadIcon size={13} aria-hidden="true" />
                <span>Download</span>
              </span>
            )}
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
        <span className={styles.btnContent}>
          <PlusIcon size={14} aria-hidden="true" />
          <span>Add Resource</span>
        </span>
      </button>

      <ResourceUploadModal
        subjects={subjects}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

