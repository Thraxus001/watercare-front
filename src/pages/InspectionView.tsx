import { Link, useParams } from "react-router-dom";
import { api, P, type Category, type Inspection, type Note } from "../api";
import { useAuth } from "../auth";
import { Card, ErrorMsg, Loading, cn, fmt, h2Cls, linkCls, mutedCls, noteCls, useAsync } from "../ui";

const TITLES: Record<Category, string> = { operation: "Operation checks", maintenance: "Maintenance checks" };

function LinkedNotes({ machineId, inspectionId }: { machineId: number; inspectionId: number }) {
  const { data } = useAsync(() => api.get<Note[]>(`/machines/${machineId}/notes`), [machineId]);
  const notes = data?.filter((n) => n.inspection_id === inspectionId) ?? [];
  if (!notes.length) return null;
  return (
    <Card>
      <h2 className={h2Cls}>Notes from this checkup</h2>
      {notes.map((n) => (
        <div className={noteCls} key={n.id}>
          <div className="whitespace-pre-wrap">{n.body}</div>
          <div className={cn(mutedCls, "text-sm")}>{n.author_name} · {fmt(n.created_at)}</div>
        </div>
      ))}
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
      <p className="mb-2 text-sm"><Link className={linkCls} to={`/machines/${i.machine_id}`}>← {i.machine_name}</Link></p>
      <Card>
        <h1 className="text-2xl font-semibold">Checkup · {i.machine_name}</h1>
        <div className={mutedCls}>{fmt(i.performed_at)} · by {i.performed_by_name}</div>
        {i.summary && <p className="mt-2">{i.summary}</p>}
      </Card>
      {(["operation", "maintenance"] as Category[]).map((c) => {
        const list = i.answers.filter((a) => a.category === c);
        if (!list.length) return null;
        return (
          <Card key={c}>
            <h2 className={h2Cls}>{TITLES[c]}</h2>
            <div className="divide-y divide-slate-100">
              {list.map((a, idx) => (
                <div className="py-3" key={idx}>
                  <b>{a.label}</b>
                  {a.options.map((o, k) => (
                    <div key={k} className={cn("text-sm", o.is_checked ? "font-medium text-green-700" : "text-slate-400")}>
                      {o.is_checked ? "✔" : "✗"} {o.label}{" "}
                      <span className="text-xs">
                        {o.is_checked ? (a.input_type === "radio" ? "(selected)" : "(done)") : a.input_type === "radio" ? "" : "(not done)"}
                      </span>
                    </div>
                  ))}
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
