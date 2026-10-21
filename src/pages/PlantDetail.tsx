import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, P, type Machine, type MachineType, type Plant } from "../api";
import { useAuth } from "../auth";
import { parseCoord, requestGpsLocation } from "../utils";
import {
  Badge, Button, Card, ErrorMsg, Field, Loading, Status,
  btnClass, cardCls, choiceCls, cn, errMsg, gridCls, h2Cls, inputCls, linkCls, mutedCls, tdCls, thCls, useAsync,
} from "../ui";

function EditPlant({ plant, onDone }: { plant: Plant; onDone: () => void }) {
  const [f, setF] = useState({
    name: plant.name,
    code: plant.code ?? "",
    location: plant.location,
    latitude: plant.latitude === null ? "" : String(plant.latitude),
    longitude: plant.longitude === null ? "" : String(plant.longitude),
    description: plant.description ?? "",
    is_active: plant.is_active,
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
      await api.patch(`/plants/${plant.id}`, {
        name: f.name.trim(),
        code: f.code.trim() || null,
        location: f.location.trim(),
        latitude: parseCoord(f.latitude),
        longitude: parseCoord(f.longitude),
        description: f.description.trim() || null,
        is_active: f.is_active,
      });
      onDone();
    } catch (err) { setError(errMsg(err)); }
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-slate-100 pt-4">
      <h3 className="font-semibold text-slate-800 mb-2">Edit plant details</h3>
      <div className={gridCls}>
        <Field label="Plant name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Plant code"><input className={inputCls} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Location"><input className={inputCls} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} required /></Field>
        <Field label="Latitude (optional)"><input className={inputCls} type="number" step="any" min="-90" max="90" value={f.latitude} onChange={(e) => setF({ ...f, latitude: e.target.value })} /></Field>
        <Field label="Longitude (optional)"><input className={inputCls} type="number" step="any" min="-180" max="180" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} /></Field>
        <div className="flex items-end">
          <Button type="button" disabled={pickingLocation} onClick={pickLocation}>
            {pickingLocation ? "Getting location…" : "📍 Pick location"}
          </Button>
        </div>
      </div>
      <Field label="Description" className="mt-3">
        <textarea className={cn(inputCls, "min-h-16")} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </Field>
      <label className={cn(choiceCls, "mt-2")}>
        <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active
      </label>
      <ErrorMsg error={error} />
      <div className="mt-3 flex gap-2">
        <Button variant="primary">Save changes</Button>
      </div>
    </form>
  );
}

function AddMachineToPlant({ plantId, defaultLocation, defaultLatitude, defaultLongitude, onDone }: { plantId: number; defaultLocation: string; defaultLatitude?: number | null; defaultLongitude?: number | null; onDone: () => void }) {
  const types = useAsync(() => api.get<MachineType[]>("/machine-types"), []);
  const [f, setF] = useState({
    name: "",
    serial_number: "",
    location: defaultLocation,
    machine_type_id: "",
    latitude: defaultLatitude != null ? String(defaultLatitude) : "",
    longitude: defaultLongitude != null ? String(defaultLongitude) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

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
      await api.post("/machines", {
        name: f.name.trim(),
        serial_number: f.serial_number.trim(),
        location: f.location.trim() || null,
        machine_type_id: Number(f.machine_type_id),
        plant_id: plantId,
        latitude: parseCoord(f.latitude),
        longitude: parseCoord(f.longitude),
      });
      onDone();
    } catch (err) { setError(errMsg(err)); }
  }

  return (
    <form>
    <form className={cardCls} onSubmit={submit}>
      <h2 className={h2Cls}>Add machine to this plant</h2>
      <div className={gridCls}>
        <Field label="Machine name"><input className={inputCls} placeholder="e.g. RO Skid #3" value={f.name} onChange={set("name")} required /></Field>
        <Field label="Serial number"><input className={inputCls} placeholder="e.g. SN-RO-9002" value={f.serial_number} onChange={set("serial_number")} required /></Field>
        <Field label="Machine type">
          <select className={inputCls} value={f.machine_type_id} onChange={set("machine_type_id")} required>
            <option value="">Select type…</option>
            {types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Specific bay / skid position"><input className={inputCls} placeholder="e.g. Bay 2" value={f.location} onChange={set("location")} /></Field>
        <Field label="Latitude (optional)"><input className={inputCls} type="number" step="any" min="-90" max="90" value={f.latitude} onChange={set("latitude")} /></Field>
        <Field label="Longitude (optional)"><input className={inputCls} type="number" step="any" min="-180" max="180" value={f.longitude} onChange={set("longitude")} /></Field>
        <div className="flex items-end">
          <Button type="button" disabled={pickingLocation} onClick={pickLocation}>
            {pickingLocation ? "Getting location…" : " Pick location"}
          </Button>
        </div>
      </div>
      <ErrorMsg error={error} />
      <Button variant="primary" className="mt-3">Save machine</Button>
    </form>
  );

      <Button variant="primary" className="mt-3">Save machine</Button>
    </form>
  );
}

export default function PlantDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingMachine, setAddingMachine] = useState(false);

  const plant = useAsync(() => api.get<Plant>(`/plants/${id}`), [id]);
  const machines = useAsync(
    () => api.get<Machine[]>(`/plants/${id}/machines${showInactive ? "?include_inactive=true" : ""}`),
    [id, showInactive]
  );

  if (plant.loading && !plant.data) return <Loading />;
  if (!plant.data) return <ErrorMsg error={plant.error ?? "Plant not found"} />;

  const p = plant.data;
  const needle = q.trim().toLowerCase();
  const rows = (machines.data ?? []).filter((m) =>
    !needle || [m.name, m.serial_number, m.location ?? "", m.machine_type_name].some((s) => s.toLowerCase().includes(needle))
  );

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-sky-600 transition-colors" to="/">
          <span>←</span>
          <span>All Plants</span>
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-800">{p.name}</span>
      </div>

      {/* Plant Header Card */}
      <Card className="relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{p.name}</h1>
              {p.code && (
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                  {p.code}
                </span>
              )}
              {!p.is_active && <Badge tone="bad">inactive</Badge>}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 rounded-lg px-2.5 py-1 text-xs">
                <span>{p.location}</span>
              </span>
              {p.latitude !== null && p.longitude !== null && (
                <span className="inline-flex items-center gap-1 font-semibold text-sky-800 bg-sky-50 border border-sky-200/60 rounded-lg px-2.5 py-1 text-xs">
                  <span>📍 {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-sky-600 underline hover:text-sky-800"
                  >
                    Map ↗
                  </a>
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 rounded-lg px-2.5 py-1 text-xs">
                <span><b>{p.machine_count}</b> {p.machine_count === 1 ? "machine" : "machines"} in plant</span>
              </span>
              <Status last={p.last_inspection} />
            </div>

            {p.description && (
              <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-3xl">{p.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {can(P.PLANTS_MANAGE, P.MACHINES_MANAGE) && (
              <Button onClick={() => setEditing(!editing)}>
                {editing ? "Cancel" : "Edit plant"}
              </Button>
            )}
            {can(P.MACHINES_MANAGE) && (
              <Button variant="primary" onClick={() => setAddingMachine(!addingMachine)}>
                {addingMachine ? "Close" : "+ Add machine"}
              </Button>
            )}
          </div>
        </div>

        {editing && (
          <EditPlant
            plant={p}
            onDone={() => {
              setEditing(false);
              plant.reload();
            }}
          />
        )}
      </Card>

      {addingMachine && (
        <AddMachineToPlant
          plantId={p.id}
          defaultLocation={p.location}
          defaultLatitude={p.latitude}
          defaultLongitude={p.longitude}
          onDone={() => {
            setAddingMachine(false);
            machines.reload();
            plant.reload();
          }}
        />
      )}

      {/* Machines within this plant */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Machines in this plant</h2>
          <p className={cn(mutedCls, "text-xs")}>Manage and inspect each machine belonging to {p.name}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className={cn(inputCls, "w-64")}
            type="search"
            placeholder="Search machines in plant…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {can(P.MACHINES_MANAGE) && (
            <label className={choiceCls}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              show inactive
            </label>
          )}
        </div>
      </div>

      <ErrorMsg error={machines.error} />

      {machines.loading && !machines.data ? (
        <Loading />
      ) : (
        <div className={cn(cardCls, "overflow-x-auto p-0")}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>Machine</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Location / Skid</th>
                <th className={thCls}>Last checkup</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className={tdCls}>
                    <Link className={cn(linkCls, "font-semibold")} to={`/machines/${m.id}`}>
                      {m.name}
                    </Link>
                    <div className={cn(mutedCls, "text-xs")}>
                      SN: {m.serial_number}
                      {!m.is_active && " · inactive"}
                    </div>
                  </td>
                  <td className={tdCls}>{m.machine_type_name}</td>
                  <td className={tdCls}>{m.location ?? p.location}</td>
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
                  <td colSpan={5} className={cn(tdCls, mutedCls, "text-center py-6")}>
                    No machines found in this plant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
