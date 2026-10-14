import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { LastInspection } from "./api";

// ───────────── helpers ─────────────
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then((data) => alive && setState({ data, loading: false }))
        .catch((e) => alive && setState({ loading: false, error: errMsg(e) }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export const fmt = (s: string) => new Date(s).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
export const daysAgo = (s: string) => Math.floor((Date.now() - new Date(s).getTime()) / 86400000);

// ───────────── shared Tailwind class sets ─────────────
export const h1Cls = "text-2xl font-semibold mb-4";
export const h2Cls = "text-lg font-semibold mb-2";
export const h3Cls = "text-base font-semibold mt-4 mb-1";
export const mutedCls = "text-slate-500";
export const linkCls = "text-brand hover:underline";
export const cardCls = "bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4";
export const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
export const gridCls = "grid gap-3 grid-cols-[repeat(auto-fit,minmax(210px,1fr))]";
export const choiceCls = "flex items-center gap-2 py-1 text-sm cursor-pointer";
export const thCls = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200";
export const tdCls = "px-3 py-2 align-top border-b border-slate-100";
export const noteCls = "border-l-4 border-brand bg-slate-50 pl-3 pr-2 py-2 my-2 rounded-r";

type Variant = "default" | "primary" | "danger";
export const btnClass = (variant: Variant = "default", size: "md" | "sm" = "md") =>
  cn(
    "inline-flex items-center justify-center rounded-md border font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
    size === "sm" ? "px-2 py-0.5 text-sm" : "px-3.5 py-1.5 text-sm",
    variant === "primary" && "bg-brand border-brand text-white hover:bg-brand-dark",
    variant === "danger" && "bg-white border-red-200 text-red-700 hover:bg-red-50",
    variant === "default" && "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
  );

// ───────────── small components ─────────────
export function Button({ variant, size, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "sm" }) {
  return <button className={cn(btnClass(variant, size), className)} {...p} />;
}

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn(cardCls, className)}>{children}</div>
);

export function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block text-sm text-slate-500", className)}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

const tones = {
  neutral: "bg-slate-100 text-slate-600",
  ok: "bg-green-100 text-green-700",
  warn: "bg-amber-100 text-amber-700",
  bad: "bg-red-100 text-red-700",
};
export const Badge = ({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) => (
  <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>
);

export const Loading = () => <p className={mutedCls}>Loading…</p>;
export const ErrorMsg = ({ error }: { error?: string | null }) =>
  error ? <div className="my-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null;

export function Status({ last }: { last: LastInspection | null }) {
  if (!last) return <Badge tone="warn">Never checked</Badge>;
  const d = daysAgo(last.performed_at);
  const label = d <= 0 ? "Checked today" : d === 1 ? "Checked yesterday" : `Checked ${d} days ago`;
  return <Badge tone={d <= 1 ? "ok" : d > 7 ? "warn" : "neutral"}>{label}</Badge>;
}
