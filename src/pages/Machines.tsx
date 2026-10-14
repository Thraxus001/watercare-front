import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, P, type Machine, type MachineType } from "../api";
import { useAuth } from "../auth";
import {
  Button, ErrorMsg, Field, Loading, Status, btnClass, cardCls, choiceCls, cn, errMsg, gridCls, h1Cls, h2Cls,
  inputCls, linkCls, mutedCls, tdCls, thCls, useAsync,
} from "../ui";

function AddMachine({ onDone }: { onDone: () => void }) {
  const types = useAsync(() => api.get<MachineType[]>("/machine-types"), []);
  const [f, setF] = useState({ name: "", serial_number: "", location: "", machine_type_id: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    try {
      await api.post("/machines", { ...f, machine_type_id: Number(f.machine_type_id), location: f.location || null });
      onDone();
    } catch (err) { setError(errMsg(err)); }
  }
  return (
    <form className={cardCls} onSubmit={submit}>
      <h2 className={h2Cls}>Add machine</h2>
      <div className={gridCls}>
        <Field label="Name"><input className={inputCls} value={f.name} onChange={set("name")} required /></Field>
        <Field label="Serial number"><input className={inputCls} value={f.serial_number} onChange={set("serial_number")} required /></Field>
        <Field label="Location"><input className={inputCls} value={f.location} onChange={set("location")} /></Field>
        <Field label="Machine type">
          <select className={inputCls} value={f.machine_type_id} onChange={set("machine_type_id")} required>
            <option value="">Select…</option>
            {types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>
      {types.data?.length === 0 && <p className={cn(mutedCls, "mt-2 text-sm")}>Create a machine type first under Checklists.</p>}
      <ErrorMsg error={error} />
      <Button variant="primary" className="mt-3">Save machine</Button>
    </form>
  );
}

export default function Machines() {
  const { can } = useAuth();
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);
  const { data, error, loading, reload } = useAsync(
    () => api.get<Machine[]>(`/machines${showInactive ? "?include_inactive=true" : ""}`), [showInactive]);

  const needle = q.trim().toLowerCase();
  const rows = (data ?? []).filter((m) =>
    !needle || [m.name, m.serial_number, m.location ?? "", m.machine_type_name].some((s) => s.toLowerCase().includes(needle)));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className={cn(h1Cls, "mb-0")}>Machines</h1>
        {can(P.MACHINES_MANAGE) && <Button variant="primary" onClick={() => setAdding(!adding)}>{adding ? "Close" : "+ Add machine"}</Button>}
      </div>
      {adding && <AddMachine onDone={() => { setAdding(false); reload(); }} />}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input className={cn(inputCls, "max-w-xs")} type="search" placeholder="Search name, serial, location…" value={q} onChange={(e) => setQ(e.target.value)} />
        {can(P.MACHINES_MANAGE) && (
          <label className={choiceCls}><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> show inactive</label>
        )}
      </div>
      <ErrorMsg error={error} />
      {loading && !data ? <Loading /> : (
        <div className={cn(cardCls, "overflow-x-auto p-0")}>
          <table className="w-full">
            <thead><tr><th className={thCls}>Machine</th><th className={thCls}>Type</th><th className={thCls}>Location</th><th className={thCls}>Last checkup</th><th className={thCls} /></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className={tdCls}>
                    <Link className={cn(linkCls, "font-semibold")} to={`/machines/${m.id}`}>{m.name}</Link>
                    <div className={cn(mutedCls, "text-sm")}>{m.serial_number}{!m.is_active && " · inactive"}</div>
                  </td>
                  <td className={tdCls}>{m.machine_type_name}</td>
                  <td className={tdCls}>{m.location ?? "—"}</td>
                  <td className={tdCls}>
                    <Status last={m.last_inspection} />
                    {m.last_inspection && <div className={cn(mutedCls, "text-sm")}>by {m.last_inspection.performed_by_name}</div>}
                  </td>
                  <td className={cn(tdCls, "text-right")}>
                    {can(P.INSPECTIONS_CREATE) && m.is_active && <Link className={btnClass("primary", "sm")} to={`/machines/${m.id}/checkup`}>New checkup</Link>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className={cn(tdCls, mutedCls)}>No machines found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
