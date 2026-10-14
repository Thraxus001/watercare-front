const BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ───────────── Types (mirror the backend schemas) ─────────────
export type Role = "admin" | "user";
export type Category = "operation" | "maintenance";
export type InputType = "radio" | "checkbox";

export const P = {
  MACHINES_VIEW: "machines:view",
  MACHINES_MANAGE: "machines:manage",
  CHECKLISTS_VIEW: "checklists:view",
  CHECKLISTS_MANAGE: "checklists:manage",
  INSPECTIONS_VIEW: "inspections:view",
  INSPECTIONS_CREATE: "inspections:create",
  INSPECTIONS_DELETE: "inspections:delete",
  NOTES_VIEW: "notes:view",
  NOTES_CREATE: "notes:create",
} as const;

export interface User { id: number; email: string; full_name: string; role: Role; is_active: boolean; permissions: string[] }
export interface PermissionInfo { code: string; description: string }
export interface MachineType { id: number; name: string; description: string | null }
export interface Option { id: number; label: string; sort_order: number; is_active: boolean }
export interface CheckItem {
  id: number; machine_type_id: number; category: Category; label: string; description: string | null
  input_type: InputType; is_required: boolean; sort_order: number; is_active: boolean; options: Option[]
}
export interface LastInspection { id: number; performed_at: string; performed_by_name: string }
export interface Machine {
  id: number; name: string; serial_number: string; location: string | null; installed_on: string | null
  is_active: boolean; machine_type_id: number; machine_type_name: string; last_inspection: LastInspection | null
}
export interface InspectionSummary {
  id: number; machine_id: number; machine_name: string; performed_by: number
  performed_by_name: string; performed_at: string; summary: string | null
}
export interface AnswerOption { option_id: number | null; label: string; is_checked: boolean }
export interface Answer { check_item_id: number | null; label: string; category: Category; input_type: InputType; options: AnswerOption[] }
export interface Inspection extends InspectionSummary { answers: Answer[] }
export interface Note {
  id: number; machine_id: number; inspection_id: number | null; author_id: number
  author_name: string; body: string; created_at: string; updated_at: string
}

// ───────────── HTTP client ─────────────
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

let token: string | null = localStorage.getItem("wc_token");
let onUnauthorized: (() => void) | null = null;
export const getToken = () => token;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };
export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("wc_token", t); else localStorage.removeItem("wc_token");
}

function formatDetail(d: unknown): string | undefined {
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d.map((x) => (typeof x === "string" ? x : (x as { msg?: string })?.msg ?? JSON.stringify(x))).join("; ");
}

async function request<T>(path: string, opts: { method?: string; body?: unknown; form?: URLSearchParams } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (opts.form) payload = opts.form;
  else if (opts.body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(opts.body); }

  let res: Response;
  try { res = await fetch(BASE + path, { method: opts.method ?? "GET", headers, body: payload }); }
  catch { throw new ApiError(0, "Can't reach the server. Is the backend running?"); }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/auth/login")) onUnauthorized?.();
    throw new ApiError(res.status, formatDetail(data?.detail) ?? res.statusText);
  }
  return data as T;
}

export const api = {
  get: <T,>(p: string) => request<T>(p),
  post: <T,>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: body ?? {} }),
  patch: <T,>(p: string, body: unknown) => request<T>(p, { method: "PATCH", body }),
  put: <T,>(p: string, body: unknown) => request<T>(p, { method: "PUT", body }),
  del: (p: string) => request<void>(p, { method: "DELETE" }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", { method: "POST", form: new URLSearchParams({ username: email, password }) }),
};
