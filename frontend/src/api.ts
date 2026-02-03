import { supabase } from "./lib/supabase";

/* ------------------ CONFIG ------------------ */
const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8000";

/* ------------------ ENTRYPOINT HELPERS ------------------ */
const ENTRYPOINT = {
  student: "student_portal",
  counselor: "counselor_portal",
  teacher: "teacher_portal",
  parent: "parent_portal",
  principal: "principal_portal",
} as const;

/* ------------------ HEADER HELPER ------------------ */
function getAuthHeaders(entrypoint?: keyof typeof ENTRYPOINT) {
  const token =
    localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };

  if (entrypoint) {
    headers["x-nefera-entrypoint"] = ENTRYPOINT[entrypoint];
  }

  return headers;
}

/* ------------------ SUPABASE LOGIN ------------------ */
export async function loginWithSupabase(
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const token = data.session?.access_token;
  if (token) {
    localStorage.setItem("token", token);
  }

  return data;
}

/* ------------------ BACKEND: SUPABASE LOGIN HANDSHAKE ------------------ */
export async function syncSupabaseUser() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/auth/supabase-login`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ access_token: token }),
  });

  if (!res.ok) throw new Error("Supabase login sync failed");
  return res.json(); // { id, email, role, name }
}

/* ------------------ STUDENT APIs ------------------ */
export async function getStudentInbox() {
  const res = await fetch(`${API_BASE}/students/inbox`, {
    headers: getAuthHeaders("student"),
  });

  if (!res.ok) throw new Error("Inbox fetch failed");
  return res.json();
}

export async function submitIncidentReport(payload: {
  incident_type: "BULLYING" | "HARASSMENT" | "RAGGING" | "OTHER";
  description: string;
  anonymous?: boolean;
}) {
  const res = await fetch(`${API_BASE}/students/reports`, {
    method: "POST",
    headers: getAuthHeaders("student"),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Incident report failed");
  return res.json();
}

/* ------------------ PRINCIPAL APIs ------------------ */
export async function getPrincipalDashboard() {
  const res = await fetch(`${API_BASE}/principal/dashboard`, {
    headers: getAuthHeaders("principal"),
  });

  if (!res.ok) throw new Error("Dashboard fetch failed");
  return res.json();
}

export async function getPrincipalReports() {
  const res = await fetch(`${API_BASE}/principal/reports`, {
    headers: getAuthHeaders("principal"),
  });

  if (!res.ok) throw new Error("Reports fetch failed");
  return res.json();
}

export async function sendPrincipalBroadcast(content: string) {
  const res = await fetch(`${API_BASE}/principal/broadcast`, {
    method: "POST",
    headers: getAuthHeaders("principal"),
    body: JSON.stringify({ content }),
  });

  if (!res.ok) throw new Error("Broadcast failed");
  return res.json();
}

/* ------------------ COUNSELOR APIs ------------------ */
export async function getCounselorDashboard() {
  const res = await fetch(`${API_BASE}/counselors/dashboard`, {
    headers: getAuthHeaders("counselor"),
  });

  if (!res.ok) throw new Error("Counselor dashboard failed");
  return res.json();
}

export async function getCounselorRiskyStudents() {
  const res = await fetch(`${API_BASE}/counselors/students/risky`, {
    headers: getAuthHeaders("counselor"),
  });

  if (!res.ok) throw new Error("Counselor risky students failed");
  return res.json();
}

export async function getCounselorStudentDetail(studentId: number | string) {
  const res = await fetch(`${API_BASE}/counselors/student/${studentId}`, {
    headers: getAuthHeaders("counselor"),
  });

  if (!res.ok) throw new Error("Counselor student detail failed");
  return res.json();
}

export async function getCounselorReports() {
  const res = await fetch(`${API_BASE}/counselors/reports`, {
    headers: getAuthHeaders("counselor"),
  });

  if (!res.ok) throw new Error("Counselor reports failed");
  return res.json();
}

/* ------------------ TEACHER APIs ------------------ */
export async function getTeacherDashboard(classId?: number) {
  const query = classId ? `?class_id=${classId}` : "";
  const res = await fetch(`${API_BASE}/teachers/dashboard${query}`, {
    headers: getAuthHeaders("teacher"),
  });

  if (!res.ok) throw new Error("Teacher dashboard failed");
  return res.json();
}

/* ------------------ PARENT APIs ------------------ */
export async function getParentDashboard() {
  const res = await fetch(`${API_BASE}/parents/dashboard`, {
    headers: getAuthHeaders("parent"),
  });

  if (!res.ok) throw new Error("Parent dashboard failed");
  return res.json();
}

/* ------------------ STUDENT APIs ------------------ */
export async function submitCheckin(data: any) {
  const res = await fetch(`${API_BASE}/students/checkin`, {
    method: "POST",
    headers: getAuthHeaders("student"),
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Check-in failed");
  return res.json();
}

export async function submitAssessment(data: any) {
  const res = await fetch(`${API_BASE}/students/assessment`, {
    method: "POST",
    headers: getAuthHeaders("student"),
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Assessment submit failed");
  return res.json();
}

/* ------------------ AUTH: student `/auth/me` check ------------------ */
export async function getStudentMe() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders("student"),
  });

  // Backend me /auth/me require_student use kar raha hai:
  // Backend: /auth/me requires a local logged-in user
  // - If local STUDENT profile exists -> 200 OK
  // - If no local profile -> 404 (ask to call /auth/supabase-login)
  if (!res.ok) {
    throw new Error("Not a student account");
  }

  return res.json(); // { id, email, role, name }
}
