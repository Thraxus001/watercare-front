import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Category, type CheckItem, type Inspection, type Machine } from "../api";
import { Button, Card, ErrorMsg, Field, Loading, choiceCls, cn, errMsg, h1Cls, h2Cls, inputCls, linkCls, mutedCls, useAsync } from "../ui";

const TITLES: Record<Category, string> = { operation: "Operation checks", maintenance: "Maintenance checks" };

export default function NewInspection() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading } = useAsync(async () => {
    const machine = await api.get<Machine>(`/machines/${id}`);
    const items = await api.get<CheckItem[]>(`/machine-types/${machine.machine_type_id}/check-items`);
    return { machine, items };
  }, [id]);

  const [sel, setSel] = useState<Record<number, number[]>>({});
  const [summary, setSummary] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorMsg error={error} />;
  const { machine, items } = data;

  const pick = (item: CheckItem, optId: number, on: boolean) =>
    setSel((s) => {
      const cur = s[item.id] ?? [];
      if (item.input_type === "radio") return { ...s, [item.id]: [optId] };
      return { ...s, [item.id]: on ? [...cur, optId] : cur.filter((x) => x !== optId) };
    });

  async function submit(e: FormEvent) {
    e.preventDefault(); setFormError(null);
    const missing = items.filter((i) => i.is_required && !(sel[i.id]?.length));
    if (missing.length) { setFormError(`Please complete: ${missing.map((m) => m.label).join(", ")}`); return; }
    setBusy(true);
    try {
      const res = await api.post<Inspection>("/inspections", {
        machine_id: machine.id, summary: summary || null, note: note || null,
        answers: items.map((i) => ({ check_item_id: i.id, selected_option_ids: sel[i.id] ?? [] })),
      });
      nav(`/inspections/${res.id}`);
    } catch (err) { setFormError(errMsg(err)); setBusy(false); }
  }

  const sections = (["operation", "maintenance"] as Category[])
    .map((c) => ({ c, list: items.filter((i) => i.category === c) })).filter((s) => s.list.length);

  return (
    <form onSubmit={submit}>
      <p className="mb-2 text-sm"><Link className={linkCls} to={`/machines/${machine.id}`}>← {machine.name}</Link></p>
      <h1 className={h1Cls}>New checkup · {machine.name}</h1>
      {items.length === 0 && <Card>No checklist has been set up for this machine type yet. Ask an admin to add one.</Card>}
      {sections.map(({ c, list }) => (
        <Card key={c}>
          <h2 className={h2Cls}>{TITLES[c]}</h2>
          <div className="divide-y divide-slate-100">
            {list.map((item) => (
              <div className="py-3" key={item.id}>
                <b>{item.label}</b> {item.is_required && <span className="text-red-600" title="Required">*</span>}
                <span className={cn(mutedCls, "text-sm")}> · {item.input_type === "radio" ? "choose one" : "tick all that apply"}</span>
                {item.description && <div className={cn(mutedCls, "text-sm")}>{item.description}</div>}
                <div className="mt-1">
                  {item.options.map((o) => (
                    <label className={choiceCls} key={o.id}>
                      <input
                        className="h-4 w-4 accent-brand"
                        type={item.input_type} name={`item-${item.id}`}
                        checked={(sel[item.id] ?? []).includes(o.id)}
                        onChange={(e) => pick(item, o.id, e.target.checked)}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
      {items.length > 0 && (
        <Card className="space-y-3">
          <Field label="Summary (optional)"><input className={inputCls} value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
          <Field label="Note on this machine (optional)">
            <textarea className={cn(inputCls, "min-h-20")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the next person should know…" />
          </Field>
          <ErrorMsg error={formError} />
          <Button variant="primary" disabled={busy}>{busy ? "Submitting…" : "Submit checkup"}</Button>
        </Card>
      )}
    </form>
  );
}
