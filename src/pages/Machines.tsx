import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, P, type Machine, type MachineType, type Plant } from "../api";
import { useAuth } from "../auth";
import {
  Button, ErrorMsg, Field, Loading, Status, btnClass, cardCls, choiceCls, cn, errMsg, gridCls, h1Cls, h2Cls,
  inputCls, linkCls, mutedCls, tdCls, thCls, useAsync,
} from "../ui";

function AddMachine({ onDone }: { onDone: () => void }) {
  const types = useAsync(() => api.get<MachineType[]>("/machine-types"), []);
  const plants = useAsync(() => api.get<Plant[]>("/plants"), []);
  const [f, setF] = useState({ name: "", serial_number: "", plant_id: "", location: "", machine_type_id: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    try {
      await api.post("/machines", {
        ...f,
        machine_type_id: Number(f.machine_type_id),
        plant_id: f.plant_id ? Number(f.plant_id) : null,
        location: f.location || null,
      });
      onDone();
    } catch (err) { setError(errMsg(err)); }
  }
  return (
    <form className={cardCls} onSubmit={submit}>
      <h2 className={h2Cls}>Add machine</h2>
      <div className={gridCls}>
        <Field label="Name"><input className={inputCls} value={f.name} onChange={set("name")} required /></Field>
        <Field label="Serial number"><input className={inputCls} value={f.serial_number} onChange={set("serial_number")} required /></Field>
        <Field label="Plant">
          <select className={inputCls} value={f.plant_id} onChange={set("plant_id")}>
            <option value="">Select plant…</option>
            {plants.data?.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.location})</option>)}
          </select>
        </Field>
        <Field label="Specific bay / position"><input className={inputCls} value={f.location} onChange={set("location")} /></Field>
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
    !needle || [m.name, m.serial_number, m.location ?? "", m.plant_name ?? "", m.machine_type_name].some((s) => s.toLowerCase().includes(needle)));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={h1Cls}>All Machines</h1>
          <p className={cn(mutedCls, "text-sm")}>
            Comprehensive inventory of all skid equipment across all plants.
          </p>
        </div>
        {can(P.MACHINES_MANAGE) && (
          <Button variant="primary" onClick={() => setAdding(!adding)}>
            {adding ? "Close" : "+ Add machine"}
          </Button>
        )}
      </div>

      {adding && <AddMachine onDone={() => { setAdding(false); reload(); }} />}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative min-w-[260px] max-w-sm flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
          <input
            className={cn(inputCls, "pl-9")}
            type="search"
            placeholder="Search name, serial, plant, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            <b>{rows.length}</b> {rows.length === 1 ? "machine" : "machines"}
          </span>
          {can(P.MACHINES_MANAGE) && (
            <label className={choiceCls}>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <span className="text-xs font-medium text-slate-600">Show inactive</span>
            </label>
          )}
        </div>
      </div>

      <ErrorMsg error={error} />

      {loading && !data ? <Loading /> : (
        <div className={cn(cardCls, "overflow-hidden p-0")}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thCls}>Machine</th>
                  <th className={thCls}>Plant & Site</th>
                  <th className={thCls}>Type</th>
                  <th className={thCls}>Last checkup</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className={tdCls}>
                      <Link className={cn(linkCls, "font-bold text-slate-900")} to={`/machines/${m.id}`}>
                        {m.name}
                      </Link>
                      <div className={cn(mutedCls, "text-xs font-mono mt-0.5")}>
                        SN: {m.serial_number}
                        {!m.is_active && " · inactive"}
                      </div>
                    </td>
                    <td className={tdCls}>
                      {m.plant_id ? (
                        <Link className={cn(linkCls, "font-semibold")} to={`/plants/${m.plant_id}`}>
                          🌱 {m.plant_name}
                        </Link>
                      ) : (
                        <span className="text-slate-600">{m.plant_name ?? "—"}</span>
                      )}
                      <div className={cn(mutedCls, "text-xs")}>{m.plant_location ?? m.location ?? "—"}</div>
                    </td>
                    <td className={tdCls}>
                      <span className="font-medium text-slate-700">{m.machine_type_name}</span>
                    </td>
                    <td className={tdCls}>
                      <Status last={m.last_inspection} />
                      {m.last_inspection && (
                        <div className={cn(mutedCls, "text-xs mt-0.5")}>
                          by {m.last_inspection.performed_by_name}
                        </div>
                      )}
                    </td>
                    <td className={cn(tdCls, "text-right")}>
                      <div className="flex items-center justify-end gap-2">
                        <Link className={btnClass("default", "sm")} to={`/machines/${m.id}`}>
                          View
                        </Link>
                        {can(P.INSPECTIONS_CREATE) && m.is_active && (
                          <Link className={btnClass("primary", "sm")} to={`/machines/${m.id}/checkup`}>
                            New checkup
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className={cn(tdCls, mutedCls, "text-center py-10")}>
                      No machines found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
