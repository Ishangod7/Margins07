// Frontend talks ONLY to the FastAPI backend. Supabase is used just to log in
// and hold the session; the access token is forwarded as a Bearer token.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Notice = {
  id: string; title: string; content: string; category: string;
  is_pinned: boolean; created_at: string; published_at: string;
  author_name: string | null;
};
export type Profile = {
  id: string;
  display_name: string;
  role: "member" | "cr";
  avatar_path?: string | null;
  bio?: string | null;
  skills: string[];
  interests: string[];
  can_help_with: string[];
  currently_learning: string[];
  show_avatar: boolean;
  show_bio: boolean;
  show_skills: boolean;
  show_interests: boolean;
  show_contributions: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PrivacySettings = {
  show_avatar: boolean;
  show_bio: boolean;
  show_skills: boolean;
  show_interests: boolean;
  show_contributions: boolean;
};

export type Person = {
  id: string;
  display_name: string;
  initials: string;
  role: "member" | "cr";
  avatar_path?: string | null;
  bio?: string | null;
  skills: string[];
  interests: string[];
  can_help_with: string[];
  currently_learning: string[];
  contributions?: {
    resources_count: number;
    answers_count: number;
    accepted_count: number;
  } | null;
  is_self?: boolean;
  joined_at?: string;
};

export type PersonDetail = Person & {
  contributions?: {
    resources_count: number;
    answers_count: number;
    accepted_count: number;
    recent_resources: Array<{
      id: string;
      title: string;
      kind: string;
      unit?: string;
      download_count: number;
      save_count: number;
      created_at: string;
    }>;
    recent_answers: Array<{
      id: string;
      doubt_id?: string;
      body: string;
      is_accepted: boolean;
      helpful_count: number;
      created_at: string;
      doubt?: {
        id: string;
        title: string;
        status: string;
      };
    }>;
  } | null;
};

export type Me = {
  id: string;
  email: string | null;
  class_id: string | null;
  joined_at?: string | null;
  profile: Profile | null;
};
export type Subject = {
  id: string; name: string; code?: string; semester?: string;
};

export type SubjectHubItem = {
  id: string;
  class_id: string;
  name: string;
  code?: string;
  semester?: string;
  resource_count: number;
  doubt_count: number;
  solved_doubt_count: number;
  helper_count: number;
};

export type SubjectDetailResponse = {
  subject: {
    id: string;
    class_id: string;
    name: string;
    code?: string;
    semester?: string;
  };
  resources: Array<{
    id: string;
    title: string;
    description?: string;
    kind: string;
    unit?: string;
    tags?: string[];
    file_name?: string;
    file_size?: number;
    mime_type?: string;
    external_url?: string;
    save_count: number;
    created_at: string;
    uploader_id: string;
    uploader_name: string;
    is_saved: boolean;
    is_mine: boolean;
  }>;
  doubts: Array<{
    id: string;
    title: string;
    body: string;
    status: "open" | "answered" | "solved";
    answer_count: number;
    created_at: string;
    author_id: string;
    author_name: string;
    is_mine: boolean;
  }>;
  helpers: Array<{
    id: string;
    display_name: string;
    role: "member" | "cr";
    bio?: string | null;
    skills: string[];
    can_help_with: string[];
  }>;
  units: Record<string, number>;
  stats: {
    total_resources: number;
    total_doubts: number;
    solved_doubts: number;
    helper_count: number;
  };
};
export type Doubt = {
  id: string;
  title: string;
  body: string;
  status: "open" | "answered" | "solved";
  tags: string[];
  accepted_answer_id: string | null;
  answer_count: number;
  follow_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  subject?: Subject | null;
  author_name: string;
  is_followed: boolean;
  is_mine: boolean;
};
export type Answer = {
  id: string;
  doubt_id: string;
  body: string;
  is_accepted: boolean;
  helpful_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  is_mine: boolean;
  has_voted: boolean;
};

export type NotificationItem = {
  id: string;
  type: "notice" | "answer" | "accepted" | "resource";
  title: string;
  body: string;
  link: string;
  created_at: string;
  actor_name: string;
  category?: string;
  is_pinned?: boolean;
};

export type DeadlineItem = {
  id: string;
  title: string;
  subject_code: string;
  subject_name: string;
  due_at: string;
  type: "lab_journal" | "mini_project" | "assignment" | "presentation" | "exam_submission";
  submission_mode: string;
  description: string;
  is_official: boolean;
  created_by_name: string;
  completed: boolean;
  urgency: "urgent" | "soon" | "normal" | "overdue";
  time_remaining: string;
};

export type DeadlinesResponse = {
  deadlines: DeadlineItem[];
  stats: {
    total_count: number;
    pending_count: number;
    completed_count: number;
    urgent_count: number;
    next_deadline: DeadlineItem | null;
  };
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiFetch<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const { headers, cache, next, ...rest } = init as RequestInit & { next?: any };
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    cache: cache ?? "no-store",
    ...(next ? { next } : {}),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = body?.detail;
    throw new ApiError(res.status, typeof d === "string" ? d : "Something went wrong");
  }
  return body as T;
}
