import { useState, type FormEvent } from "react";
import { api, type PermissionInfo, type Role, type User } from "../api";
import { useAuth } from "../auth";
import { Badge, Button, Card, ErrorMsg, Field, Loading, choiceCls, cn, errMsg, gridCls, h1Cls, h2Cls, h3Cls, inputCls, mutedCls, useAsync } from "../ui";

const permGrid = "grid gap-x-4 gap-y-0.5 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]";

function PermissionPicker({ all, value, onChange }: { all: PermissionInfo[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className={permGrid}>
      {all.map((p) => (
        <label className={choiceCls} key={p.code}>
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={value.includes(p.code)}
            onChange={(e) => onChange(e.target.checked ? [...value, p.code] : value.filter((x) => x !== p.code))} />
          <span>{p.description} <span className="text-xs text-slate-400">({p.code})</span></span>
        </label>
      ))}
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
        <h2 className={h2Cls}>New user</h2>
        <div className={gridCls}>
          <Field label="Full name"><input className={inputCls} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></Field>
          <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Field>
          <Field label="Temporary password (min 8)"><input className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} minLength={8} required /></Field>
          <Field label="Role">
            <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              <option value="user">User (permissions below)</option><option value="admin">Admin (full access)</option>
            </select>
          </Field>
        </div>
        {f.role === "user" && <><h3 className={h3Cls}>What can they do?</h3><PermissionPicker all={all} value={perms} onChange={setPerms} /></>}
        <ErrorMsg error={error} />
        <Button variant="primary" className="mt-3">Create user</Button>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <b>{u.full_name}</b> {u.role === "admin" && <Badge>admin</Badge>} {!u.is_active && <Badge tone="bad">deactivated</Badge>}
          <div className={cn(mutedCls, "text-sm")}>{u.email}</div>
        </div>
        <div className="flex flex-wrap gap-2">
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
        <div className={cn(mutedCls, "mt-2 text-sm")}>{u.permissions.length ? u.permissions.join(" · ") : "No permissions granted yet"}</div>
      )}
      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {!isSelf && (
            <Field label="Role" className="max-w-xs">
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="user">User</option><option value="admin">Admin (full access)</option>
              </select>
            </Field>
          )}
          {role === "user"
            ? <><h3 className={h3Cls}>Permissions</h3><PermissionPicker all={all} value={perms} onChange={setPerms} /></>
            : <p className={cn(mutedCls, "mt-2")}>Admins can do everything.</p>}
          <Button variant="primary" className="mt-3" onClick={save}>Save</Button>
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className={cn(h1Cls, "mb-0")}>Users</h1>
        <Button variant="primary" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ New user"}</Button>
      </div>
      {adding && <CreateUser all={perms.data} onDone={() => { setAdding(false); users.reload(); }} />}
      {users.data.map((u) => (
        <UserCard key={`${u.id}-${u.role}-${u.permissions.join()}`} u={u} all={perms.data!} isSelf={u.id === user?.id} onChange={users.reload} />
      ))}
    </>
  );
}
