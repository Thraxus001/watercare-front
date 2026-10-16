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
      </form>
    </div>
  );
}
