import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type InspectionSummary, type Machine } from "../api";
import { ErrorMsg, Loading, cardCls, cn, fmt, h1Cls, inputCls, linkCls, mutedCls, tdCls, thCls, useAsync } from "../ui";

export default function Inspections() {
  const [machineId, setMachineId] = useState("");
  const machines = useAsync(() => api.get<Machine[]>("/machines").catch(() => [] as Machine[]), []);
  const { data, error, loading } = useAsync(
    () => api.get<InspectionSummary[]>(`/inspections?limit=100${machineId ? `&machine_id=${machineId}` : ""}`), [machineId]);

  return (
    <>
      <h1 className={h1Cls}>Checkups</h1>
      <select className={cn(inputCls, "mb-3 max-w-xs")} value={machineId} onChange={(e) => setMachineId(e.target.value)}>
        <option value="">All machines</option>
        {machines.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <ErrorMsg error={error} />
      {loading && !data ? <Loading /> : (
        <div className={cn(cardCls, "overflow-x-auto p-0")}>
          <table className="w-full">
            <thead><tr><th className={thCls}>When</th><th className={thCls}>Machine</th><th className={thCls}>Checked by</th><th className={thCls}>Summary</th></tr></thead>
            <tbody>
              {data?.map((i) => (
                <tr key={i.id}>
                  <td className={tdCls}><Link className={linkCls} to={`/inspections/${i.id}`}>{fmt(i.performed_at)}</Link></td>
                  <td className={tdCls}>{i.machine_name}</td><td className={tdCls}>{i.performed_by_name}</td><td className={tdCls}>{i.summary ?? "—"}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={4} className={cn(tdCls, mutedCls)}>No checkups yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
