import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button, ErrorMsg, Field, cardCls, cn, errMsg, h1Cls, inputCls, mutedCls } from "../ui";

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
    <form className={cn(cardCls, "mx-auto mt-[12vh] max-w-sm p-6")} onSubmit={submit}>
      <h1 className={h1Cls + " mb-1"}>💧 WaterCare</h1>
      <p className={cn(mutedCls, "mb-4 text-sm")}>Sign in to log and review machine checkups.</p>
      <div className="space-y-3">
        <Field label="Email"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
        <Field label="Password"><input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
      </div>
      <ErrorMsg error={error} />
      <Button variant="primary" className="mt-4 w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
