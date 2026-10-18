import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button, ErrorMsg, Field, cardCls, cn, errMsg, inputCls, mutedCls } from "../ui";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await login(email, password); nav("/"); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form className={cn(cardCls, "w-full max-w-md p-8 shadow-md border-slate-200/80")} onSubmit={submit}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center text-2xl shadow-sm shadow-sky-500/30">
            💧
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">WaterCare</h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Operations & Maintenance</p>
          </div>
        </div>

        <p className={cn(mutedCls, "mb-6 text-sm")}>Sign in to access plant equipment and log maintenance inspections.</p>
        
        <div className="space-y-4">
          <Field label="Email address">
            <input className={inputCls} type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
        </div>

        <ErrorMsg error={error} />
        
        <Button variant="primary" className="mt-6 w-full py-2.5 text-sm" disabled={busy}>
          {busy ? "Signing in…" : "Sign in to WaterCare"}
        </Button>

        <div className="mt-6 pt-5 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-700">Seed Accounts & Credentials</span>
            <span className="text-[11px] font-mono text-slate-400">Password: ChangeMe123!</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@yourcompany.com");
                setPassword("ChangeMe123!");
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-sky-50/80 hover:border-sky-300 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  ADM
                </span>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-sky-900">System Admin</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">admin@yourcompany.com</div>
                </div>
              </div>
              <span className="text-xs font-medium text-sky-600 group-hover:underline shrink-0 ml-2">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("admin@watercare.local");
                setPassword("ChangeMe123!");
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-sky-50/80 hover:border-sky-300 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  ADM
                </span>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">Admin (Local)</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">admin@watercare.local</div>
                </div>
              </div>
              <span className="text-xs font-medium text-sky-600 group-hover:underline shrink-0 ml-2">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("john.tech@watercare.local");
                setPassword("ChangeMe123!");
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-sky-50/80 hover:border-sky-300 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  TEC
                </span>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-900">John Doe (Technician)</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">john.tech@watercare.local</div>
                </div>
              </div>
              <span className="text-xs font-medium text-sky-600 group-hover:underline shrink-0 ml-2">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("sarah.operator@watercare.local");
                setPassword("ChangeMe123!");
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-sky-50/80 hover:border-sky-300 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  OPR
                </span>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-purple-900">Sarah Connor (Operator)</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">sarah.operator@watercare.local</div>
                </div>
              </div>
              <span className="text-xs font-medium text-sky-600 group-hover:underline shrink-0 ml-2">Fill</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
