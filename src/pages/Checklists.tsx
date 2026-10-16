import { useState, type FormEvent } from "react";
import { api, type Category, type CheckItem, type InputType, type MachineType } from "../api";
import { Badge, Button, Card, ErrorMsg, Field, Loading, choiceCls, cn, errMsg, gridCls, h1Cls, h2Cls, inputCls, mutedCls, useAsync } from "../ui";

function NewItem({ typeId, onDone }: { typeId: number; onDone: () => void }) {
  const [f, setF] = useState({ label: "", category: "operation" as Category, input_type: "radio" as InputType, is_required: false, options: "" });
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    const options = f.options.split("\n").map((s) => s.trim()).filter(Boolean).map((label, i) => ({ label, sort_order: i }));
    try {
      await api.post(`/machine-types/${typeId}/check-items`, { label: f.label, category: f.category, input_type: f.input_type, is_required: f.is_required, options });
      setF({ ...f, label: "", options: "" }); onDone();
    } catch (err) { setError(errMsg(err)); }
  }
  return (
    <form onSubmit={submit}>
      <Card>
        <div className="border-b border-slate-100 pb-2 mb-3">
          <h2 className={h2Cls}>Add new checklist item</h2>
        </div>
        <div className={gridCls}>
          <Field label="What should be checked?"><input className={inputCls} placeholder="e.g. Inlet Feed Pressure" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} required /></Field>
          <Field label="Category">
            <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>
              <option value="operation">Operation</option><option value="maintenance">Maintenance</option>
            </select>
          </Field>
          <Field label="Answer type">
            <select className={inputCls} value={f.input_type} onChange={(e) => setF({ ...f, input_type: e.target.value as InputType })}>
              <option value="radio">Radio – pick one</option><option value="checkbox">Checkboxes – tick any</option>
            </select>
          </Field>
        </div>
        <Field className="mt-3" label={`Options (one per line)${f.input_type === "checkbox" ? " – for a simple done/not done check, enter just “Done”" : " – at least two options required"}`}>
          <textarea className={cn(inputCls, "min-h-24")} value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })}
            placeholder={f.input_type === "radio" ? "Normal (ΔP < 15 psi)\nElevated (15-25 psi)\nCritical (> 25 psi)" : "Filter element inspected and clean\nHousing O-ring lubricated\nAir bleed valve purged"} required />
        </Field>
        <label className={cn(choiceCls, "mt-2")}>
          <input type="checkbox" className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 accent-sky-600" checked={f.is_required} onChange={(e) => setF({ ...f, is_required: e.target.checked })} />
          <span className="font-medium text-slate-800">Required (must be answered on every inspection)</span>
        </label>
        <ErrorMsg error={error} />
        <Button variant="primary" className="mt-3">Add check to checklist</Button>
      </Card>
    </form>
  );
}

function ItemCard({ item, onChange }: { item: CheckItem; onChange: () => void }) {
  const [newOpt, setNewOpt] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>) { setError(null); try { await fn(); onChange(); } catch (e) { setError(errMsg(e)); } }
  return (
    <div className="py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <b className="text-slate-900 text-sm font-semibold">{item.label}</b>
          <Badge>{item.input_type}</Badge>
          {item.is_required && <Badge tone="warn">required</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => run(() => api.patch(`/check-items/${item.id}`, { is_required: !item.is_required }))}>
            {item.is_required ? "Make optional" : "Make required"}
          </Button>
          <Button size="sm" variant="danger" onClick={() => confirm("Archive this check? Past checkups keep it, new ones won't show it.") && run(() => api.del(`/check-items/${item.id}`))}>
            Archive
          </Button>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {item.options.map((o) => (
          <span key={o.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
            {o.label}
            <button className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5 text-sm leading-none" title="Remove option" onClick={() => run(() => api.del(`/check-item-options/${o.id}`))}>×</button>
          </span>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); if (newOpt.trim()) run(async () => { await api.post(`/check-items/${item.id}/options`, { label: newOpt.trim(), sort_order: item.options.length }); setNewOpt(""); }); }}>
          <input className={cn(inputCls, "w-32 py-1 text-xs rounded-lg")} placeholder="+ add option" value={newOpt} onChange={(e) => setNewOpt(e.target.value)} />
        </form>
      </div>
      <ErrorMsg error={error} />
    </div>
  );
}

export default function Checklists() {
  const types = useAsync(() => api.get<MachineType[]>("/machine-types"), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const current = selected ?? types.data?.[0]?.id ?? null;
  const items = useAsync(() => (current ? api.get<CheckItem[]>(`/machine-types/${current}/check-items`) : Promise.resolve([])), [current]);

  async function addType(e: FormEvent) {
    e.preventDefault(); setError(null);
    try { const t = await api.post<MachineType>("/machine-types", { name: name.trim() }); setName(""); setSelected(t.id); types.reload(); }
    catch (err) { setError(errMsg(err)); }
  }
  async function removeType(t: MachineType) {
    if (!confirm(`Delete machine type "${t.name}" and its whole checklist?`)) return;
    try { await api.del(`/machine-types/${t.id}`); setSelected(null); types.reload(); } catch (err) { setError(errMsg(err)); }
  }

  if (!types.data) return types.error ? <ErrorMsg error={types.error} /> : <Loading />;
  const type = types.data.find((t) => t.id === current);

  return (
    <>
      <div className="mb-6">
        <h1 className={h1Cls}>Checklist Configurations</h1>
        <p className={cn(mutedCls, "text-sm")}>
          Define custom inspection and maintenance checklists for each category of machinery.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div>
          <Card className="sticky top-24">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Machine Types</h3>
            <div className="space-y-1">
              {types.data.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "block w-full rounded-xl px-3 py-2 text-left text-sm transition-all duration-150 cursor-pointer font-medium",
                    t.id === current
                      ? "bg-sky-50 text-sky-800 font-bold ring-1 ring-sky-200/80 shadow-2xs"
                      : "text-slate-700 hover:bg-slate-100/80"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
            {types.data.length === 0 && <p className={cn(mutedCls, "text-sm py-2")}>No machine types yet.</p>}
            
            <form onSubmit={addType} className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">Add new type</span>
              <input className={inputCls} placeholder="e.g. Centrifugal Pump Skid…" value={name} onChange={(e) => setName(e.target.value)} required />
              <Button size="sm" variant="primary" className="w-full">Create machine type</Button>
            </form>
            <ErrorMsg error={error} />
          </Card>
        </div>

        <div>
          {type && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{type.name}</h2>
                  <p className={cn(mutedCls, "text-xs mt-0.5")}>{type.description ?? "Standard checklist template for this machine type."}</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => removeType(type)}>Delete type</Button>
              </div>

              <ErrorMsg error={items.error} />
              {(["operation", "maintenance"] as Category[]).map((c) => {
                const list = items.data?.filter((i) => i.category === c) ?? [];
                return (
                  <Card key={c}>
                    <div className="border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                      <h2 className={h2Cls}>{c === "operation" ? "Operation checks" : "Maintenance checks"}</h2>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{list.length} checks</span>
                    </div>
                    <div className="divide-y divide-slate-100">{list.map((i) => <ItemCard key={i.id} item={i} onChange={items.reload} />)}</div>
                    {list.length === 0 && <p className={cn(mutedCls, "text-sm py-3 text-center")}>No checks configured in this section yet.</p>}
                  </Card>
                );
              })}
              <NewItem typeId={type.id} onDone={items.reload} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
