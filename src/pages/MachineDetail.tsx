import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, P, type InspectionSummary, type Machine, type MachineType, type Note } from "../api";
import { useAuth } from "../auth";
import {
  Badge, Button, Card, ErrorMsg, Field, Loading, Status, btnClass, choiceCls, cn, errMsg, fmt, gridCls, h2Cls,
  inputCls, linkCls, mutedCls, noteCls, tdCls, useAsync,
} from "../ui";

function EditMachine({ m, onDone }: { m: Machine; onDone: () => void }) {
  const types = useAsync(() => api.get<MachineType[]>("/machine-types"), []);
  const [f, setF] = useState({ name: m.name, serial_number: m.serial_number, location: m.location ?? "", machine_type_id: String(m.machine_type_id), is_active: m.is_active });
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    try { await api.patch(`/machines/${m.id}`, { ...f, machine_type_id: Number(f.machine_type_id), location: f.location || null }); onDone(); }
    catch (err) { setError(errMsg(err)); }
  }
  return (
    <form onSubmit={submit} className="mt-4 border-t border-slate-100 pt-4">
      <div className={gridCls}>
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Serial number"><input className={inputCls} value={f.serial_number} onChange={(e) => setF({ ...f, serial_number: e.target.value })} required /></Field>
        <Field label="Location"><input className={inputCls} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        <Field label="Machine type">
          <select className={inputCls} value={f.machine_type_id} onChange={(e) => setF({ ...f, machine_type_id: e.target.value })}>
            {types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>
      <label className={cn(choiceCls, "mt-2")}><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active (uncheck to retire this machine)</label>
      <ErrorMsg error={error} />
      <Button variant="primary">Save changes</Button>
    </form>
  );
}

function Notes({ machineId }: { machineId: number }) {
  const { user, can } = useAuth();
  const { data, error, reload } = useAsync(() => api.get<Note[]>(`/machines/${machineId}/notes`), [machineId]);
  const [body, setBody] = useState("");
  const [err2, setErr2] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault(); setErr2(null);
    try { await api.post(`/machines/${machineId}/notes`, { body }); setBody(""); reload(); }
    catch (x) { setErr2(errMsg(x)); }
  }
  async function remove(id: number) {
    if (!confirm("Delete this note?")) return;
    try { await api.del(`/notes/${id}`); reload(); } catch (x) { setErr2(errMsg(x)); }
  }
  return (
    <Card>
      <h2 className={h2Cls}>Notes</h2>
      {can(P.NOTES_CREATE) && (
        <form onSubmit={add}>
          <textarea className={cn(inputCls, "min-h-20")} placeholder="Write a note about this machine…" value={body} onChange={(e) => setBody(e.target.value)} required />
          <Button variant="primary" className="mt-2">Add note</Button>
        </form>
      )}
      <ErrorMsg error={error ?? err2} />
      {data?.map((n) => (
        <div className={noteCls} key={n.id}>
          <div className="whitespace-pre-wrap">{n.body}</div>
          <div className={cn(mutedCls, "text-sm")}>
            {n.author_name} · {fmt(n.created_at)}
            {n.inspection_id && <> · <Link className={linkCls} to={`/inspections/${n.inspection_id}`}>from checkup #{n.inspection_id}</Link></>}
            {(n.author_id === user?.id || user?.role === "admin") && (
              <> · <button className={linkCls} onClick={() => remove(n.id)}>delete</button></>
            )}
          </div>
        </div>
      ))}
      {data?.length === 0 && <p className={cn(mutedCls, "mt-3")}>No notes yet.</p>}
    </Card>
  );
}

export default function MachineDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [editing, setEditing] = useState(false);
  const machine = useAsync(() => api.get<Machine>(`/machines/${id}`), [id]);
  const history = useAsync(
    () => (can(P.INSPECTIONS_VIEW) ? api.get<InspectionSummary[]>(`/inspections?machine_id=${id}&limit=50`) : Promise.resolve([])), [id]);

  if (machine.loading && !machine.data) return <Loading />;
  if (!machine.data) return <ErrorMsg error={machine.error} />;
  const m = machine.data;

  return (
    <>
      <p className="mb-2 text-sm"><Link className={linkCls} to="/">← Machines</Link></p>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">{m.name} {!m.is_active && <Badge tone="bad">inactive</Badge>}</h1>
            <div className={mutedCls}>{m.machine_type_name} · SN {m.serial_number} · {m.location ?? "no location"}</div>
          </div>
          <div className="flex gap-2">
            {can(P.MACHINES_MANAGE) && <Button onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit"}</Button>}
            {can(P.INSPECTIONS_CREATE) && m.is_active && <Link className={btnClass("primary")} to={`/machines/${m.id}/checkup`}>New checkup</Link>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Status last={m.last_inspection} />
          {m.last_inspection && (
            <span className={cn(mutedCls, "text-sm")}>
              {fmt(m.last_inspection.performed_at)} by {m.last_inspection.performed_by_name}
              {can(P.INSPECTIONS_VIEW) && <> · <Link className={linkCls} to={`/inspections/${m.last_inspection.id}`}>see what was done</Link></>}
            </span>
          )}
        </div>
        {editing && <EditMachine m={m} onDone={() => { setEditing(false); machine.reload(); }} />}
      </Card>

      {can(P.INSPECTIONS_VIEW) && (
        <Card>
          <h2 className={h2Cls}>Checkup history</h2>
          <ErrorMsg error={history.error} />
          <table className="w-full">
            <tbody>
              {history.data?.map((i) => (
                <tr key={i.id}>
                  <td className={tdCls}><Link className={linkCls} to={`/inspections/${i.id}`}>{fmt(i.performed_at)}</Link></td>
                  <td className={tdCls}>{i.performed_by_name}</td>
                  <td className={cn(tdCls, mutedCls)}>{i.summary}</td>
                </tr>
              ))}
              {history.data?.length === 0 && <tr><td className={cn(tdCls, mutedCls)}>No checkups recorded yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
      {can(P.NOTES_VIEW) && <Notes machineId={m.id} />}
    </>
  );
}
