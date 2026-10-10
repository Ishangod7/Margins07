import re
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from ..auth import CurrentUser, get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/resources", tags=["resources"])

ALLOWED_KINDS = {"notes", "pyq", "slides", "book", "link", "assignment", "other"}
ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip",
    "txt", "png", "jpg", "jpeg", "webp", "ipynb", "py"
}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


def _membership(user: CurrentUser) -> str:
    m = (
        supabase_admin.table("class_memberships")
        .select("class_id")
        .eq("user_id", user.user_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    if not m or not m.data:
        raise HTTPException(403, "You are not an active member of a class")
    return m.data["class_id"]


def _is_cr(user_id: str) -> bool:
    p = supabase_admin.table("profiles").select("role").eq("id", user_id).maybe_single().execute()
    return bool(p and p.data and p.data.get("role") == "cr")


class UploadUrlIn(BaseModel):
    file_name: str = Field(min_length=1, max_length=255)
    file_size: int = Field(gt=0)
    mime_type: Optional[str] = None


class ResourceCreateIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = Field(default="", max_length=2000)
    subject_id: Optional[str] = None
    kind: str = "notes"
    unit: Optional[str] = None
    tags: List[str] = []
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    external_url: Optional[str] = None


@router.get("/subjects")
def list_subjects(user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)
    subjects = (
        supabase_admin.table("subjects")
        .select("id, name, code, semester")
        .eq("class_id", class_id)
        .order("name")
        .execute()
        .data or []
    )

    # Count resources per subject
    res_counts = (
        supabase_admin.table("resources")
        .select("subject_id")
        .eq("class_id", class_id)
        .execute()
        .data or []
    )
    count_map = {}
    for r in res_counts:
        sid = r.get("subject_id")
        if sid:
            count_map[sid] = count_map.get(sid, 0) + 1

    for s in subjects:
        s["resource_count"] = count_map.get(s["id"], 0)

    return subjects


@router.post("/upload-url")
def get_upload_url(body: UploadUrlIn, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    if body.file_size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File size exceeds limit of {MAX_FILE_SIZE // (1024*1024)} MB")

    ext = body.file_name.rsplit(".", 1)[-1].lower() if "." in body.file_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File extension '.{ext}' is not supported. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    # Sanitize filename
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", body.file_name)
    path = f"{class_id}/{user.user_id}/{uuid.uuid4()}-{safe_name}"

    try:
        res = supabase_admin.storage.from_("resources").create_signed_upload_url(path)
        # res can be a dict with signed_url / signedUrl or url
        upload_url = res.get("signed_url") or res.get("signedUrl") or res.get("url")
        token = res.get("token")
        return {"upload_url": upload_url, "file_path": path, "token": token}
    except Exception as e:
        raise HTTPException(500, f"Failed to generate upload URL: {str(e)}")


@router.get("")
def list_resources(
    subject_id: Optional[str] = Query(None),
    kind: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    sort: Optional[str] = Query("recent"),
    user: CurrentUser = Depends(get_current_user),
):
    class_id = _membership(user)

    query = supabase_admin.table("resources").select("*").eq("class_id", class_id)

    if subject_id:
        query = query.eq("subject_id", subject_id)
    if kind and kind in ALLOWED_KINDS:
        query = query.eq("kind", kind)
    if q and q.strip():
        search_term = q.strip()
        query = query.or_(f"title.ilike.%{search_term}%,description.ilike.%{search_term}%")

    if sort == "popular":
        query = query.order("save_count", desc=True).order("download_count", desc=True)
    elif sort == "downloads":
        query = query.order("download_count", desc=True)
    else:
        query = query.order("created_at", desc=True)

    resources = query.execute().data or []

    # Populate subject names
    sub_ids = list({r["subject_id"] for r in resources if r.get("subject_id")})
    sub_map = {}
    if sub_ids:
        subs = supabase_admin.table("subjects").select("id, name, code").in_("id", sub_ids).execute().data or []
        for s in subs:
            sub_map[s["id"]] = s

    # Populate author names
    author_ids = list({r["created_by"] for r in resources if r.get("created_by")})
    name_map = {}
    if author_ids:
        profiles = supabase_admin.table("profiles").select("id, display_name").in_("id", author_ids).execute().data or []
        for p in profiles:
            name_map[p["id"]] = p["display_name"]

    # Check saves for current user
    saved_ids = set()
    if resources:
        saves = (
            supabase_admin.table("resource_saves")
            .select("resource_id")
            .eq("user_id", user.user_id)
            .execute()
            .data or []
        )
        saved_ids = {s["resource_id"] for s in saves}

    for r in resources:
        sid = r.get("subject_id")
        r["subject"] = sub_map.get(sid)
        r["author_name"] = name_map.get(r.get("created_by"), "Classmate")
        r["is_saved"] = r["id"] in saved_ids

    return resources


@router.post("", status_code=201)
def create_resource(body: ResourceCreateIn, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)

    if body.kind not in ALLOWED_KINDS:
        raise HTTPException(400, f"Invalid resource kind. Allowed: {', '.join(sorted(ALLOWED_KINDS))}")

    # Validate Link vs File
    if body.kind == "link":
        if not body.external_url or not body.external_url.startswith("https://"):
            raise HTTPException(400, "External link must be a valid secure URL starting with https://")
        # Strip tracking or unsafe schemes
        if any(bad in body.external_url.lower() for bad in ["javascript:", "data:", "127.0.0.1", "localhost"]):
            raise HTTPException(400, "Invalid or unsafe URL host")
    else:
        if not body.file_path:
            raise HTTPException(400, "File path is required for file uploads")
        expected_prefix = f"{class_id}/{user.user_id}/"
        if not body.file_path.startswith(expected_prefix):
            raise HTTPException(403, "File path does not match your user directory")

    row = {
        "class_id": class_id,
        "title": body.title.strip(),
        "description": body.description.strip() if body.description else "",
        "subject_id": body.subject_id,
        "kind": body.kind,
        "unit": body.unit.strip() if body.unit else None,
        "tags": body.tags or [],
        "file_path": body.file_path,
        "file_name": body.file_name,
        "file_size": body.file_size,
        "mime_type": body.mime_type,
        "external_url": body.external_url,
        "created_by": user.user_id,
    }

    res = supabase_admin.table("resources").insert(row).execute()
    if not res.data:
        raise HTTPException(500, "Failed to create resource")
    return res.data[0]


@router.get("/{resource_id}")
def get_resource(resource_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)
    r = (
        supabase_admin.table("resources")
        .select("*")
        .eq("id", resource_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not r or not r.data:
        raise HTTPException(404, "Resource not found")
    data = r.data

    if data.get("subject_id"):
        sub = supabase_admin.table("subjects").select("id, name, code").eq("id", data["subject_id"]).maybe_single().execute()
        data["subject"] = sub.data if sub else None

    if data.get("created_by"):
        p = supabase_admin.table("profiles").select("display_name").eq("id", data["created_by"]).maybe_single().execute()
        data["author_name"] = p.data["display_name"] if p and p.data else "Classmate"

    saved = (
        supabase_admin.table("resource_saves")
        .select("id")
        .eq("resource_id", resource_id)
        .eq("user_id", user.user_id)
        .maybe_single()
        .execute()
    )
    data["is_saved"] = bool(saved and saved.data)
    return data


@router.get("/{resource_id}/download")
def download_resource(resource_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)
    r = (
        supabase_admin.table("resources")
        .select("id, kind, file_path, external_url, download_count")
        .eq("id", resource_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not r or not r.data:
        raise HTTPException(404, "Resource not found")
    data = r.data

    # Increment download count
    supabase_admin.table("resources").update({"download_count": data["download_count"] + 1}).eq("id", resource_id).execute()

    if data["kind"] == "link":
        return {"download_url": data["external_url"], "kind": "link", "expires_in": None}

    if not data.get("file_path"):
        raise HTTPException(400, "Resource has no associated file")

    try:
        # Generate 60-second signed download URL
        res = supabase_admin.storage.from_("resources").create_signed_url(data["file_path"], 60)
        signed_url = res.get("signed_url") or res.get("signedUrl") or res.get("url")
        return {"download_url": signed_url, "kind": "file", "expires_in": 60}
    except Exception as e:
        raise HTTPException(500, f"Failed to generate download URL: {str(e)}")


@router.post("/{resource_id}/save")
def toggle_save(resource_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)
    r = (
        supabase_admin.table("resources")
        .select("id, save_count")
        .eq("id", resource_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not r or not r.data:
        raise HTTPException(404, "Resource not found")
    res_data = r.data

    existing = (
        supabase_admin.table("resource_saves")
        .select("id")
        .eq("resource_id", resource_id)
        .eq("user_id", user.user_id)
        .maybe_single()
        .execute()
    )

    if existing and existing.data:
        # Unsave
        supabase_admin.table("resource_saves").delete().eq("id", existing.data["id"]).execute()
        new_count = max(0, res_data["save_count"] - 1)
        supabase_admin.table("resources").update({"save_count": new_count}).eq("id", resource_id).execute()
        return {"is_saved": False, "save_count": new_count}
    else:
        # Save
        supabase_admin.table("resource_saves").insert({"resource_id": resource_id, "user_id": user.user_id}).execute()
        new_count = res_data["save_count"] + 1
        supabase_admin.table("resources").update({"save_count": new_count}).eq("id", resource_id).execute()
        return {"is_saved": True, "save_count": new_count}


@router.delete("/{resource_id}", status_code=204)
def delete_resource(resource_id: str, user: CurrentUser = Depends(get_current_user)):
    class_id = _membership(user)
    r = (
        supabase_admin.table("resources")
        .select("id, created_by, file_path")
        .eq("id", resource_id)
        .eq("class_id", class_id)
        .maybe_single()
        .execute()
    )
    if not r or not r.data:
        raise HTTPException(404, "Resource not found")
    res_data = r.data

    # Check permission: Author or CR
    if res_data["created_by"] != user.user_id and not _is_cr(user.user_id):
        raise HTTPException(403, "Only the uploader or a CR can delete this resource")

    # Delete storage file if exists
    if res_data.get("file_path"):
        try:
            supabase_admin.storage.from_("resources").remove([res_data["file_path"]])
        except Exception:
            pass

    supabase_admin.table("resources").delete().eq("id", resource_id).execute()
