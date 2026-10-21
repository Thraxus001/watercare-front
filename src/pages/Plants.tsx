import { useState, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, P, type Plant } from "../api";
import { useAuth } from "../auth";
import { parseCoord, requestGpsLocation } from "../utils";
import {
  Badge, Button, Card, ErrorMsg, Field, Loading, Status,
  cardCls, choiceCls, cn, errMsg, gridCls, h1Cls, h2Cls, inputCls, mutedCls, useAsync,
} from "../ui";

function AddPlant({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", code: "", location: "", description: "", latitude: "", longitude: "" });
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
      await api.post("/plants", {
        name: f.name.trim(),
        code: f.code.trim() || null,
        location: f.location.trim(),
        description: f.description.trim() || null,
        latitude: parseCoord(f.latitude),
        longitude: parseCoord(f.longitude),
      });
      onDone();
    } catch (err) { setError(errMsg(err)); }
  }

  return (
    <form className={cardCls} onSubmit={submit}>
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <h2 className={h2Cls}>Add new plant</h2>
        <span className="text-xs text-slate-400">Plants belong to locations and host machines</span>
      </div>
      <div className={gridCls}>
        <Field label="Plant name"><input className={inputCls} placeholder="e.g. Reverse Osmosis Treatment Plant" value={f.name} onChange={set("name")} required /></Field>
        <Field label="Plant code (optional)"><input className={inputCls} placeholder="e.g. PLT-RO-01" value={f.code} onChange={set("code")} /></Field>
        <Field label="Location"><input className={inputCls} placeholder="e.g. Main Water Facility" value={f.location} onChange={set("location")} required /></Field>
        <Field label="Latitude (optional)"><input className={inputCls} type="number" step="any" min="-90" max="90" placeholder="e.g. 1.234567" value={f.latitude} onChange={set("latitude")} /></Field>
        <Field label="Longitude (optional)"><input className={inputCls} type="number" step="any" min="-180" max="180" placeholder="e.g. 36.821946" value={f.longitude} onChange={set("longitude")} /></Field>
        <div className="flex items-end">
          <Button type="button" disabled={pickingLocation} onClick={pickLocation}>
            {pickingLocation ? "Getting location…" : "📍 Pick location"}
          </Button>
        </div>
      </div>
      <Field label="Description (optional)" className="mt-3">
        <textarea className={cn(inputCls, "min-h-18")} placeholder="Plant purpose, capacity, or operational notes…" value={f.description} onChange={set("description")} />
      </Field>
      <ErrorMsg error={error} />
      <div className="mt-3 flex gap-2">
        <Button variant="primary">Save plant</Button>
      </div>
    </form>
  );
}

export default function Plants() {
  const { can } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [selectedLoc, setSelectedLoc] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);

  const { data, error, loading, reload } = useAsync(
    () => api.get<Plant[]>(`/plants${showInactive ? "?include_inactive=true" : ""}`),
    [showInactive]
  );

  const needle = q.trim().toLowerCase();

  // Extract unique locations
  const locations = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((p) => {
      if (p.location) set.add(p.location);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filter plants
  const filteredPlants = useMemo(() => {
    return (data ?? []).filter((p) => {
      const matchesSearch = !needle || [p.name, p.code ?? "", p.location, p.description ?? ""].some((s) => s.toLowerCase().includes(needle));
      const matchesLoc = selectedLoc === "all" || p.location.toLowerCase() === selectedLoc.toLowerCase();
      return matchesSearch && matchesLoc;
    });
  }, [data, needle, selectedLoc]);

  // Group by location
  const grouped = useMemo(() => {
    const map = new Map<string, Plant[]>();
    for (const p of filteredPlants) {
      const loc = p.location || "Unspecified Location";
      if (!map.has(loc)) map.set(loc, []);
      map.get(loc)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPlants]);

  const totalMachines = useMemo(() => {
    return (data ?? []).reduce((acc, p) => acc + (p.machine_count || 0), 0);
  }, [data]);

  const activePlantsCount = useMemo(() => {
    return (data ?? []).filter((p) => p.is_active).length;
  }, [data]);

  return (
    <>
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={h1Cls}>Plants & Facilities</h1>
          <p className={cn(mutedCls, "text-sm")}>
            Browse facilities by location. Click any plant to access its machines, checkup logs, and maintenance tasks.
          </p>
        </div>
        {can(P.PLANTS_MANAGE, P.MACHINES_MANAGE) && (
          <Button variant="primary" onClick={() => setAdding(!adding)}>
            {adding ? "Close" : "+ Add new plant"}
          </Button>
        )}
      </div>

      {adding && (
        <AddPlant
          onDone={() => {
            setAdding(false);
            reload();
          }}
        />
      )}

      {/* KPI Metric Summary Strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span> Locations</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{locations.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Active sites</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span> Plants</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{activePlantsCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Operating plants</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span> Machines</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totalMachines}</div>
          <div className="text-xs text-slate-400 mt-0.5">Skids & equipment</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span> Status</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">Active</div>
          <div className="text-xs text-slate-400 mt-0.5">All systems online</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
            <input
              className={cn(inputCls, "pl-9")}
              type="search"
              placeholder="Search plant name, code, location…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {locations.length > 0 && (
            <select
              className={cn(inputCls, "w-auto min-w-[160px]")}
              value={selectedLoc}
              onChange={(e) => setSelectedLoc(e.target.value)}
            >
              <option value="all">All Locations ({locations.length})</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3 pl-2">
          {can(P.PLANTS_MANAGE, P.MACHINES_MANAGE) && (
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

      {loading && !data ? (
        <Loading />
      ) : grouped.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-semibold text-base text-slate-800">No plants found</h3>
          <p className={cn(mutedCls, "text-sm mt-1")}>
            Try adjusting your search terms or clearing location filters.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([locName, plants]) => {
            const locMachines = plants.reduce((sum, p) => sum + (p.machine_count || 0), 0);
            return (
              <section key={locName} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2.5">
                    
                    <div>
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">{locName}</h2>
                    </div>
                    <span className="text-xs font-semibold rounded-full bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 text-slate-600">
                      {plants.length} {plants.length === 1 ? "plant" : "plants"} · {locMachines} {locMachines === 1 ? "machine" : "machines"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                  {plants.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => nav(`/plants/${p.id}`)}
                      className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/60 hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-slate-900 group-hover:text-sky-600 transition-colors">
                                {p.name}
                              </h3>
                              {!p.is_active && <Badge tone="bad">inactive</Badge>}
                            </div>
                            {p.code && (
                              <span className="inline-block mt-1 font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-md px-2 py-0.5">
                                {p.code}
                              </span>
                            )}
                          </div>
                          <Status last={p.last_inspection} />
                        </div>

                        {p.description && (
                          <p className={cn(mutedCls, "mt-2.5 text-sm line-clamp-2 leading-relaxed")}>
                            {p.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <span>
                            <b>{p.machine_count}</b> {p.machine_count === 1 ? "machine" : "machines in plant"}
                          </span>
                          {p.latitude !== null && p.longitude !== null && (
                            <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                              📍 GPS
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 group-hover:text-sky-700 transition-colors">
                          <span>View machines</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
