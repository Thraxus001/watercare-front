import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Category, type CheckItem, type Inspection, type Machine, type Plant } from "../api";
import { haversineMetres, parseCoord } from "../utils";
import { Button, Card, ErrorMsg, Field, Loading, choiceCls, cn, errMsg, h1Cls, h2Cls, inputCls, mutedCls, useAsync } from "../ui";

const TITLES: Record<Category, string> = { operation: "Operation checks", maintenance: "Maintenance checks" };
type GpsState = "pending" | "acquired" | "denied" | "error";
type Coordinates = { latitude: number; longitude: number; accuracy: number };

export default function NewInspection() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading } = useAsync(async () => {
    const machine = await api.get<Machine>(`/machines/${id}`);
    const items = await api.get<CheckItem[]>(`/machine-types/${machine.machine_type_id}/check-items`);
    let plant: Plant | null = null;
    if (machine.plant_id) {
      try { plant = await api.get<Plant>(`/plants/${machine.plant_id}`); } catch { /* ignore */ }
    }
    return { machine, items, plant };
  }, [id]);

  const [sel, setSel] = useState<Record<number, number[]>>({});
  const [summary, setSummary] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gpsState, setGpsState] = useState<GpsState>("pending");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [gpsAttempt, setGpsAttempt] = useState(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState("error");
      return;
    }
    setGpsState("pending");
    let watchId = -1;
    let timeoutId: number | undefined;

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsState("acquired");
      },
      (positionError) => setGpsState(positionError.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );

    timeoutId = window.setTimeout(() => {
      setGpsState((current) => (current === "pending" ? "error" : current));
    }, 25_000);

    return () => {
      if (watchId >= 0) navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(timeoutId);
    };
  }, [gpsAttempt]);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorMsg error={error} />;
  const { machine, items, plant } = data;

  // Determine pre-registered location: machine coordinates take precedence, then plant
  const machineLat = parseCoord(machine.latitude);
  const machineLon = parseCoord(machine.longitude);
  const plantLat = parseCoord(plant?.latitude);
  const plantLon = parseCoord(plant?.longitude);

  const targetLat = machineLat ?? plantLat ?? null;
  const targetLon = machineLon ?? plantLon ?? null;
  const targetLabel = machineLat != null
    ? `machine '${machine.name}'`
    : plantLat != null
    ? `plant '${plant?.name}'`
    : null;

  const hasRegisteredLocation = targetLat !== null && targetLon !== null;
  const distanceMetres = coords && hasRegisteredLocation
    ? haversineMetres(targetLat, targetLon, coords.latitude, coords.longitude)
    : null;

  // The margin for error is ±10 meters from the preregistered location
  const locationAllowed = !hasRegisteredLocation || (distanceMetres !== null && distanceMetres <= 10.0);
  const canSubmitLocation = gpsState === "acquired" && coords !== null && locationAllowed;

  let gpsMessage = "Acquiring GPS location from your device…";
  let gpsStyle = "border-sky-200 bg-sky-50 text-sky-800";

  if (gpsState === "denied") {
    gpsMessage = "Location access denied. Please allow GPS access in your browser to submit this checkup.";
    gpsStyle = "border-rose-200 bg-rose-50 text-rose-800";
  } else if (gpsState === "error") {
    gpsMessage = "Unable to get your GPS location. Please check device location settings and click Retry.";
    gpsStyle = "border-rose-200 bg-rose-50 text-rose-800";
  } else if (gpsState === "acquired") {
    if (hasRegisteredLocation) {
      if (distanceMetres !== null && distanceMetres <= 10.0) {
        gpsMessage = `✔ Location verified: You are ${distanceMetres.toFixed(1)} m from ${targetLabel} (within ±10 m radius).`;
        gpsStyle = "border-emerald-200 bg-emerald-50 text-emerald-800";
      } else {
        gpsMessage = `✘ Outside allowed radius: You are ${distanceMetres?.toFixed(1)} m away from ${targetLabel}. You must be within 10 m to submit.`;
        gpsStyle = "border-rose-200 bg-rose-50 text-rose-800";
      }
    } else {
      gpsMessage = `ℹ️ No pre-registered coordinates on machine/plant. Your device location (${coords?.latitude.toFixed(6)}, ${coords?.longitude.toFixed(6)}) will be stamped on this checkup.`;
      gpsStyle = "border-emerald-200 bg-emerald-50 text-emerald-800";
    }
  }

  const pick = (item: CheckItem, optId: number, on: boolean) =>
    setSel((s) => {
      const cur = s[item.id] ?? [];
      if (item.input_type === "radio") return { ...s, [item.id]: [optId] };
      return { ...s, [item.id]: on ? [...cur, optId] : cur.filter((x) => x !== optId) };
    });

  async function submit(e: FormEvent) {
    e.preventDefault(); setFormError(null);
    if (!coords || !canSubmitLocation) {
      if (hasRegisteredLocation && distanceMetres !== null && distanceMetres > 10.0) {
        setFormError(`Submission rejected: You are ${distanceMetres.toFixed(1)} m away from ${targetLabel}. You must be within a 10-meter radius to submit.`);
      } else {
        setFormError("Device GPS location is required to submit this checkup.");
      }
      return;
    }
    const missing = items.filter((i) => i.is_required && !(sel[i.id]?.length));
    if (missing.length) { setFormError(`Please complete: ${missing.map((m) => m.label).join(", ")}`); return; }
    setBusy(true);
    try {
      const res = await api.post<Inspection>("/inspections", {
        machine_id: machine.id, summary: summary || null, note: note || null,
        latitude: coords.latitude, longitude: coords.longitude, location_accuracy: coords.accuracy,
        answers: items.map((i) => ({ check_item_id: i.id, selected_option_ids: sel[i.id] ?? [] })),
      });
      nav(`/inspections/${res.id}`);
    } catch (err) { setFormError(errMsg(err)); setBusy(false); }
  }

  const sections = (["operation", "maintenance"] as Category[])
    .map((c) => ({ c, list: items.filter((i) => i.category === c) })).filter((s) => s.list.length);

  return (
    <form onSubmit={submit} className="max-w-3xl mx-auto">
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-sky-600 transition-colors" to={`/machines/${machine.id}`}>
          <span>←</span>
          <span>{machine.name}</span>
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-800">New checkup</span>
      </div>

      <div className="mb-6">
        <h1 className={h1Cls}>New Checkup · {machine.name}</h1>
        <p className={cn(mutedCls, "text-sm")}>
          Fill out the required checklist items according to standard operating procedures.
        </p>
      </div>

      {items.length === 0 && (
        <Card className="text-center py-8">
          <p className={mutedCls}>No checklist has been configured for this machine type yet.</p>
        </Card>
      )}

      {sections.map(({ c, list }) => (
        <Card key={c}>
          <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
            <h2 className={h2Cls}>{TITLES[c]}</h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {list.length} {list.length === 1 ? "check" : "checks"}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {list.map((item) => (
              <div className="py-4 first:pt-1 last:pb-1" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <div className="font-bold text-slate-900 text-sm">
                    {item.label} {item.is_required && <span className="text-rose-600 font-bold" title="Required">*</span>}
                  </div>
                  <span className={cn(mutedCls, "text-xs font-medium")}>
                    {item.input_type === "radio" ? "Choose one" : "Select all that apply"}
                  </span>
                </div>
                {item.description && <div className={cn(mutedCls, "text-xs mb-2.5")}>{item.description}</div>}

                <div className="space-y-1.5 mt-2">
                  {item.options.map((o) => {
                    const isChecked = (sel[item.id] ?? []).includes(o.id);
                    return (
                      <label
                        className={cn(
                          choiceCls,
                          "px-3 py-2 rounded-xl border transition-all",
                          isChecked
                            ? "bg-sky-50/70 border-sky-300/80 text-sky-950 font-medium"
                            : "bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700"
                        )}
                        key={o.id}
                      >
                        <input
                          className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600"
                          type={item.input_type}
                          name={`item-${item.id}`}
                          checked={isChecked}
                          onChange={(e) => pick(item, o.id, e.target.checked)}
                        />
                        <span className="text-sm">{o.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {items.length > 0 && (
        <Card className="space-y-4">
          <div role="status" className={cn("rounded-xl border px-3 py-2.5 text-sm font-medium", gpsStyle)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {gpsState === "pending" && <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]" />}
                <span>{gpsMessage}</span>
                {coords && (
                  <span className="ml-1 text-xs opacity-80 block sm:inline">
                    · Device GPS: {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)} (±{Math.round(coords.accuracy)} m)
                  </span>
                )}
              </div>
              {gpsState !== "pending" && (
                <Button type="button" size="sm" onClick={() => setGpsAttempt((attempt) => attempt + 1)}>
                  🔄 Re-check GPS
                </Button>
              )}
            </div>
          </div>
          <Field label="Inspection summary (optional)">
            <input
              className={inputCls}
              placeholder="e.g. Filter washed, differential pressure normal"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </Field>
          <Field label="Operational note for this machine (optional)">
            <textarea
              className={cn(inputCls, "min-h-20")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything significant the next technician or plant operator should know…"
            />
          </Field>
          <ErrorMsg error={formError} />
          <Button
            variant="primary"
            disabled={busy || !canSubmitLocation}
            className="w-full sm:w-auto"
          >
            {busy ? "Submitting checkup…" : "Submit checkup"}
          </Button>
        </Card>
      )}
    </form>
  );
}
