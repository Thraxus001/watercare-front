import { useState, type FormEvent } from "react";
import { api, type PermissionInfo, type Role, type User } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, ErrorMsg, Field, Loading, choiceCls, cn, errMsg, gridCls, h1Cls, h2Cls, h3Cls, inputCls, mutedCls, useAsync } from "../ui";

const permGrid = "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3";

function PermissionPicker({ all, value, onChange }: { all: PermissionInfo[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className={permGrid}>
      {all.map((p) => {
        const checked = value.includes(p.code);
        return (
          <label
            className={cn(
              choiceCls,
              "px-3 py-2 rounded-xl border transition-all text-xs",
              checked
                ? "bg-sky-50/80 border-sky-300 text-sky-950 font-medium"
                : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50"
            )}
            key={p.code}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600"
              checked={checked}
              onChange={(e) => onChange(e.target.checked ? [...value, p.code] : value.filter((x) => x !== p.code))}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800">{p.description}</span>
              <span className="text-[10px] text-slate-400 font-mono">{p.code}</span>
            </div>
          </label>
        );
      })}
    </div>
  );
}

function CreateUser({ all, onDone }: { all: PermissionInfo[]; onDone: () => void }) {
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "user" as Role });
  const [perms, setPerms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    try { await api.post("/users", { ...f, permissions: f.role === "admin" ? [] : perms }); onDone(); }
    catch (err) { setError(errMsg(err)); }
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <div className="border-b border-slate-100 pb-2 mb-3">
          <h2 className={h2Cls}>Create new user</h2>
        </div>
        <div className={gridCls}>
          <Field label="Full name"><input className={inputCls} placeholder="e.g. John Doe" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></Field>
          <Field label="Email address"><input className={inputCls} placeholder="e.g. user@watercare.local" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Field>
          <Field label="Temporary password (min 8)"><input className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} minLength={8} required /></Field>
          <Field label="System role">
            <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              <option value="user">Operator (custom permissions below)</option>
              <option value="admin">Administrator (full system access)</option>
            </select>
          </Field>
        </div>
        {f.role === "user" && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className={h3Cls}>Assigned permissions</h3>
            <PermissionPicker all={all} value={perms} onChange={setPerms} />
          </div>
        )}
        <ErrorMsg error={error} />
        <Button variant="primary" className="mt-4">Save and create user</Button>
      </Card>
    </form>
  );
}

function UserCard({ u, all, isSelf, onChange }: { u: User; all: PermissionInfo[]; isSelf: boolean; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(u.role);
  const [perms, setPerms] = useState<string[]>(u.permissions);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try { await fn(); onChange(); } catch (e) { setError(errMsg(e)); }
  }

  const save = () => run(async () => {
    if (role !== u.role) await api.patch(`/users/${u.id}`, { role });
    if (role === "user") await api.put(`/users/${u.id}/permissions`, { permissions: perms });
    setOpen(false);
  });

  const resetPw = () => {
    const password = prompt(`New password for ${u.full_name} (min 8 characters):`);
    if (password) run(() => api.patch(`/users/${u.id}`, { password }));
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-sm flex items-center justify-center">
            {u.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{u.full_name}</span>
              {u.role === "admin" && <Badge tone="brand">Admin</Badge>}
              {!u.is_active && <Badge tone="bad">Deactivated</Badge>}
              {isSelf && <span className="text-xs text-slate-400">(You)</span>}
            </div>
            <div className={cn(mutedCls, "text-xs mt-0.5")}>{u.email}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setOpen(!open)}>{open ? "Close" : "Edit access"}</Button>
          <Button size="sm" onClick={resetPw}>Reset password</Button>
          {!isSelf && (
            <Button size="sm" variant={u.is_active ? "danger" : "default"} onClick={() => run(() => api.patch(`/users/${u.id}`, { is_active: !u.is_active }))}>
              {u.is_active ? "Deactivate" : "Reactivate"}
            </Button>
          )}
        </div>
      </div>

      {!open && u.role === "user" && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
          {u.permissions.length > 0 ? (
            u.permissions.map((p) => (
              <span key={p} className="inline-block text-[11px] font-mono font-medium bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                {p}
              </span>
            ))
          ) : (
            <span className={cn(mutedCls, "text-xs italic")}>No individual permissions granted yet.</span>
          )}
        </div>
      )}

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {!isSelf && (
            <Field label="System role" className="max-w-xs mb-3">
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="user">Operator (custom permissions)</option>
                <option value="admin">Administrator (full access)</option>
              </select>
            </Field>
          )}
          {role === "user" ? (
            <>
              <h3 className={h3Cls}>Granted Permissions</h3>
              <PermissionPicker all={all} value={perms} onChange={setPerms} />
            </>
          ) : (
            <p className={cn(mutedCls, "text-xs mt-1")}>Administrators have unrestricted access to all modules and user management.</p>
          )}
          <Button variant="primary" className="mt-4" onClick={save}>Save permissions</Button>
        </div>
      )}
      <ErrorMsg error={error} />
    </Card>
  );
}

export default function Users() {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const users = useAsync(() => api.get<User[]>("/users"), []);
  const perms = useAsync(() => api.get<PermissionInfo[]>("/users/permissions"), []);

  if (!users.data || !perms.data) return users.error ? <ErrorMsg error={users.error} /> : <Loading />;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={h1Cls}>Team & User Management</h1>
          <p className={cn(mutedCls, "text-sm")}>
            Manage operator accounts, password resets, and individual access permissions.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Add new user"}</Button>
      </div>

      {adding && <CreateUser all={perms.data} onDone={() => { setAdding(false); users.reload(); }} />}

      <div className="space-y-4">
        {users.data.map((u) => (
          <UserCard key={`${u.id}-${u.role}-${u.permissions.join()}`} u={u} all={perms.data!} isSelf={u.id === user?.id} onChange={users.reload} />
        ))}
      </div>
    </>
  );
}
