import { Link, useParams } from "react-router-dom";
import { api, P, type Category, type Inspection, type Note } from "../api";
import { useAuth } from "../auth";
import { parseCoord } from "../utils";
import { Card, ErrorMsg, Loading, cn, fmt, h2Cls, linkCls, mutedCls, noteCls, useAsync } from "../ui";

const TITLES: Record<Category, string> = { operation: "Operation checks", maintenance: "Maintenance checks" };

function LinkedNotes({ machineId, inspectionId }: { machineId: number; inspectionId: number }) {
  const { data } = useAsync(() => api.get<Note[]>(`/machines/${machineId}/notes`), [machineId]);
  const notes = data?.filter((n) => n.inspection_id === inspectionId) ?? [];
  if (!notes.length) return null;
  return (
    <Card>
      <h2 className={h2Cls}>Notes recorded during checkup</h2>
      <div className="space-y-3 mt-3">
        {notes.map((n) => (
          <div className={noteCls} key={n.id}>
            <div className="whitespace-pre-wrap text-sm text-slate-800">{n.body}</div>
            <div className={cn(mutedCls, "mt-2 text-xs")}>{n.author_name} · {fmt(n.created_at)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function InspectionView() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data: i, error, loading } = useAsync(() => api.get<Inspection>(`/inspections/${id}`), [id]);

  if (loading && !i) return <Loading />;
  if (!i) return <ErrorMsg error={error} />;

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-sky-600 transition-colors" to="/inspections">
          <span>←</span>
          <span>All Checkups</span>
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium text-slate-800">Checkup #{i.id}</span>
      </div>

      <Card className="border-l-4 border-l-sky-500">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Checkup · {i.machine_name}
            </h1>
            <div className={cn(mutedCls, "mt-1.5 flex flex-wrap items-center gap-2 text-sm")}>
              <span className="font-semibold text-slate-800"> {fmt(i.performed_at)}</span>
              <span>·</span>
              <span>Inspected by <b>{i.performed_by_name}</b></span>
            </div>
            {parseCoord(i.latitude) !== null && parseCoord(i.longitude) !== null && (
              <div className="mt-2.5 inline-flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 border border-sky-200/70 px-2.5 py-1 text-xs text-sky-900 font-medium">
                <span>📍 GPS Stamp: {parseCoord(i.latitude)!.toFixed(6)}, {parseCoord(i.longitude)!.toFixed(6)}</span>
                {i.location_accuracy !== null && (
                  <span className="text-sky-600 font-normal">±{Math.round(i.location_accuracy)} m</span>
                )}
                <a
                  href={`https://www.google.com/maps?q=${i.latitude},${i.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-700 underline hover:text-sky-950 ml-1"
                >
                  View on map ↗
                </a>
              </div>
            )}
            {i.summary && (
              <div className="mt-3 bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900 block mb-0.5 text-xs uppercase tracking-wide">Summary:</span>
                {i.summary}
              </div>
            )}
          </div>
          <div>
            <Link className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors" to={`/machines/${i.machine_id}`}>
              View machine details →
            </Link>
          </div>
        </div>
      </Card>

      {(["operation", "maintenance"] as Category[]).map((c) => {
        const list = i.answers.filter((a) => a.category === c);
        if (!list.length) return null;
        return (
          <Card key={c}>
            <div className="border-b border-slate-100 pb-2 mb-4">
              <h2 className={h2Cls}>{TITLES[c]}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {list.map((a, idx) => (
                <div className="py-4 first:pt-0 last:pb-0" key={idx}>
                  <div className="font-bold text-slate-900 text-sm">{a.label}</div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {a.options.map((o, k) => (
                      <div
                        key={k}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors",
                          o.is_checked
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-2xs"
                            : "border-slate-200 bg-slate-50 text-slate-400 opacity-60"
                        )}
                      >
                        <span className={cn("text-xs font-bold", o.is_checked ? "text-emerald-600" : "text-slate-400")}>
                          {o.is_checked ? "✔" : "✗"}
                        </span>
                        <span>{o.label}</span>
                        {o.is_checked && (
                          <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">
                            ({a.input_type === "radio" ? "selected" : "completed"})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      {can(P.NOTES_VIEW) && <LinkedNotes machineId={i.machine_id} inspectionId={i.id} />}
    </>
  );
}
