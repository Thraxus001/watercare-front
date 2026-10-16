import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Category, type CheckItem, type Inspection, type Machine } from "../api";
import { Button, Card, ErrorMsg, Field, Loading, choiceCls, cn, errMsg, h1Cls, h2Cls, inputCls, mutedCls, useAsync } from "../ui";

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
          <Button variant="primary" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Submitting checkup…" : "Submit checkup"}
          </Button>
        </Card>
      )}
    </form>
  );
}
