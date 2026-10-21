import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, P, type InspectionSummary, type Machine, type MachineType, type Note, type Plant } from "../api";
import { useAuth } from "../auth";
import { parseCoord, requestGpsLocation } from "../utils";
import {
  Badge, Button, Card, ErrorMsg, Field, Loading, Status, btnClass, choiceCls, cn, errMsg, fmt, gridCls, h2Cls,
  inputCls, linkCls, mutedCls, noteCls, tdCls, thCls, useAsync,
} from "../ui";

function EditMachine({ m, onDone }: { m: Machine; onDone: () => void }) {
  const types = useAsync(() => api.get<MachineType[]>("/machine-types"), []);
  const plants = useAsync(() => api.get<Plant[]>("/plants"), []);
  const [f, setF] = useState({
    name: m.name,
    serial_number: m.serial_number,
    location: m.location ?? "",
    machine_type_id: String(m.machine_type_id),
    plant_id: m.plant_id ? String(m.plant_id) : "",
    is_active: m.is_active,
    latitude: m.latitude === null ? "" : String(m.latitude),
    longitude: m.longitude === null ? "" : String(m.longitude),
  });
  const [error, setError] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);

  async function pickLocation() {
    setError(null);
    setPickingLocation(true);
    try {
      const coords = await requestGpsLocation();
      setF((current) => ({
        ...current,
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
      }));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setPickingLocation(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    try {
      await api.patch(`/machines/${m.id}`, {
        name: f.name.trim(),
        serial_number: f.serial_number.trim(),
        machine_type_id: Number(f.machine_type_id),
        plant_id: f.plant_id ? Number(f.plant_id) : null,
        location: f.location.trim() || null,
        latitude: parseCoord(f.latitude),
        longitude: parseCoord(f.longitude),
        is_active: f.is_active,
      });
      onDone();
    } catch (err) { setError(errMsg(err)); }
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-slate-100 pt-4">
      <div className={gridCls}>
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Serial number"><input className={inputCls} value={f.serial_number} onChange={(e) => setF({ ...f, serial_number: e.target.value })} required /></Field>
        <Field label="Plant">
          <select className={inputCls} value={f.plant_id} onChange={(e) => setF({ ...f, plant_id: e.target.value })}>
            <option value="">No plant assigned</option>
            {plants.data?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.location})</option>)}
          </select>
        </Field>
        <Field label="Specific bay / position"><input className={inputCls} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        <Field label="Latitude (optional)"><input className={inputCls} type="number" step="any" min="-90" max="90" value={f.latitude} onChange={(e) => setF({ ...f, latitude: e.target.value })} /></Field>
        <Field label="Longitude (optional)"><input className={inputCls} type="number" step="any" min="-180" max="180" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} /></Field>
        <div className="flex items-end">
          <Button type="button" disabled={pickingLocation} onClick={pickLocation}>
            {pickingLocation ? "Getting location…" : "Pick location"}
          </Button>
        </div>
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
      <div className="mb-4 flex items-center gap-2 text-sm">
        {m.plant_id ? (
          <Link className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-sky-600 transition-colors" to={`/plants/${m.plant_id}`}>
            <span>←</span>
            <span>{m.plant_name ?? "Back to plant"}</span>
          </Link>
        ) : (
          <Link className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-sky-600 transition-colors" to="/">
            <span>←</span>
            <span>All Plants</span>
          </Link>
        )}
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-800">{m.name}</span>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{m.name}</h1>
              {!m.is_active && <Badge tone="bad">inactive</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{m.machine_type_name}</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">SN: {m.serial_number}</span>
              {m.plant_name && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1">
                  
                    <Link className={linkCls} to={`/plants/${m.plant_id}`}>{m.plant_name}</Link>
                    <span className="text-slate-400">({m.plant_location ?? m.location})</span>
                  </span>
                </>
              )}
            </div>
            <div className={cn(mutedCls, "mt-2 text-xs flex items-center gap-1.5")}>
              <span>📍 Registered GPS location:</span>
              {parseCoord(m.latitude) !== null && parseCoord(m.longitude) !== null ? (
                <>
                  <span className="font-mono text-slate-700">{parseCoord(m.latitude)!.toFixed(6)}, {parseCoord(m.longitude)!.toFixed(6)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${m.latitude},${m.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 underline hover:text-sky-800 ml-1"
                  >
                    Map ↗
                  </a>
                </>
              ) : (
                <span className="text-amber-600 font-medium">Not registered individually (will use plant location if available)</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {can(P.MACHINES_MANAGE) && <Button onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "Edit machine"}</Button>}
            {can(P.INSPECTIONS_CREATE) && m.is_active && <Link className={btnClass("primary")} to={`/machines/${m.id}/checkup`}>New checkup</Link>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <Status last={m.last_inspection} />
          {m.last_inspection && (
            <span className={cn(mutedCls, "text-xs")}>
              Last performed {fmt(m.last_inspection.performed_at)} by <b>{m.last_inspection.performed_by_name}</b>
              {can(P.INSPECTIONS_VIEW) && <> · <Link className={linkCls} to={`/inspections/${m.last_inspection.id}`}>view answers</Link></>}
            </span>
          )}
        </div>
        {editing && <EditMachine m={m} onDone={() => { setEditing(false); machine.reload(); }} />}
      </Card>

      {can(P.INSPECTIONS_VIEW) && (
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className={h2Cls}>Checkup history</h2>
            <p className={cn(mutedCls, "text-xs")}>Audit log of all operational and maintenance inspections recorded for this machine.</p>
          </div>
          <ErrorMsg error={history.error} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thCls}>Date & Time</th>
                  <th className={thCls}>Inspector</th>
                  <th className={thCls}>Inspection Summary</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {history.data?.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className={tdCls}>
                      <Link className={cn(linkCls, "font-semibold")} to={`/inspections/${i.id}`}>
                        {fmt(i.performed_at)}
                      </Link>
                    </td>
                    <td className={tdCls}>
                      <span className="font-medium text-slate-800">{i.performed_by_name}</span>
                    </td>
                    <td className={cn(tdCls, "text-slate-600")}>{i.summary ?? "—"}</td>
                    <td className={cn(tdCls, "text-right")}>
                      <Link className={btnClass("default", "sm")} to={`/inspections/${i.id}`}>
                        View checkup →
                      </Link>
                    </td>
                  </tr>
                ))}
                {history.data?.length === 0 && (
                  <tr><td colSpan={4} className={cn(tdCls, mutedCls, "text-center py-6")}>No checkups recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {can(P.NOTES_VIEW) && <Notes machineId={m.id} />}
    </>
  );
}
