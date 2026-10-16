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
export const h1Cls = "text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3";
export const h2Cls = "text-lg sm:text-xl font-bold tracking-tight text-slate-900 mb-2";
export const h3Cls = "text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-2";
export const mutedCls = "text-slate-500";
export const linkCls = "text-sky-600 hover:text-sky-800 hover:underline font-medium transition-colors";
export const cardCls = "bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 sm:p-6 mb-5 transition-all";
export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-500/15 disabled:bg-slate-50 disabled:text-slate-400";
export const gridCls = "grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]";
export const choiceCls = "flex items-center gap-2.5 py-1.5 text-sm text-slate-700 cursor-pointer select-none hover:text-slate-900 transition-colors";
export const thCls = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/70 border-b border-slate-200/80 first:rounded-l-lg last:rounded-r-lg";
export const tdCls = "px-4 py-3.5 align-middle border-b border-slate-100 text-sm";
export const noteCls = "border-l-4 border-sky-500 bg-sky-50/40 pl-4 pr-3 py-3 my-2.5 rounded-r-xl border-y border-r border-slate-100/80 shadow-2xs";

type Variant = "default" | "primary" | "danger" | "ghost";
export const btnClass = (variant: Variant = "default", size: "md" | "sm" = "md") =>
  cn(
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none",
    size === "sm" ? "px-2.5 py-1 text-xs gap-1.5" : "px-4 py-2 text-sm gap-2",
    variant === "primary" && "bg-sky-600 border border-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 shadow-xs shadow-sky-600/10 focus-visible:ring-2 focus-visible:ring-sky-500/40",
    variant === "danger" && "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 active:bg-rose-200 focus-visible:ring-2 focus-visible:ring-rose-500/30",
    variant === "default" && "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300",
    variant === "ghost" && "bg-transparent border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
    <label className={cn("block text-xs font-semibold text-slate-700", className)}>
      <span className="mb-1.5 block tracking-tight">{label}</span>
      {children}
    </label>
  );
}

const tones = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200/80",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  warn: "bg-amber-50 text-amber-800 border-amber-200/80",
  bad: "bg-rose-50 text-rose-700 border-rose-200/80",
  brand: "bg-sky-50 text-sky-700 border-sky-200/80",
};

export const Badge = ({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight shadow-2xs", tones[tone])}>
    {children}
  </span>
);

export const Loading = () => (
  <div className="flex items-center gap-2.5 py-8 text-slate-500 justify-center">
    <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-sm font-medium">Loading data…</span>
  </div>
);

export const ErrorMsg = ({ error }: { error?: string | null }) =>
  error ? (
    <div className="my-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-xs">
      <span className="text-rose-600 text-base leading-none">⚠️</span>
      <div className="flex-1 font-medium">{error}</div>
    </div>
  ) : null;

export function Status({ last }: { last: LastInspection | null }) {
  if (!last) {
    return (
      <Badge tone="warn">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
        Never checked
      </Badge>
    );
  }
  const d = daysAgo(last.performed_at);
  const label = d <= 0 ? "Checked today" : d === 1 ? "Checked yesterday" : `Checked ${d}d ago`;
  const tone = d <= 1 ? "ok" : d > 7 ? "warn" : "neutral";
  const dotColor = d <= 1 ? "bg-emerald-500" : d > 7 ? "bg-amber-500" : "bg-slate-400";
  return (
    <Badge tone={tone}>
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", dotColor)}></span>
      {label}
    </Badge>
  );
}
