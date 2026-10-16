import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type InspectionSummary, type Machine } from "../api";
import { ErrorMsg, Loading, btnClass, cardCls, cn, fmt, h1Cls, inputCls, linkCls, mutedCls, tdCls, thCls, useAsync } from "../ui";

export default function Inspections() {
  const [machineId, setMachineId] = useState("");
  const machines = useAsync(() => api.get<Machine[]>("/machines").catch(() => [] as Machine[]), []);
  const { data, error, loading } = useAsync(
    () => api.get<InspectionSummary[]>(`/inspections?limit=100${machineId ? `&machine_id=${machineId}` : ""}`),
    [machineId]
  );

  return (
    <>
      <div className="mb-6">
        <h1 className={h1Cls}>Checkups & Inspections</h1>
        <p className={cn(mutedCls, "text-sm")}>
          Review logs of routine operations and maintenance checks performed across all plants.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">
            Filter by Machine:
          </label>
          <select
            className={cn(inputCls, "w-auto min-w-[240px]")}
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
          >
            <option value="">All machines & plants ({machines.data?.length ?? 0})</option>
            {machines.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.plant_name ? `(${m.plant_name})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 pr-2">
          Showing <b>{data?.length ?? 0}</b> checkup records
        </div>
      </div>

      <ErrorMsg error={error} />

      {loading && !data ? (
        <Loading />
      ) : (
        <div className={cn(cardCls, "overflow-hidden p-0")}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thCls}>Date & Time</th>
                  <th className={thCls}>Machine</th>
                  <th className={thCls}>Checked by</th>
                  <th className={thCls}>Inspection Summary</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {data?.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className={tdCls}>
                      <Link className={cn(linkCls, "font-semibold")} to={`/inspections/${i.id}`}>
                        {fmt(i.performed_at)}
                      </Link>
                    </td>
                    <td className={tdCls}>
                      <Link className="font-semibold text-slate-800 hover:text-sky-600 transition-colors" to={`/machines/${i.machine_id}`}>
                        {i.machine_name}
                      </Link>
                    </td>
                    <td className={tdCls}>
                      <span className="font-medium text-slate-700">{i.performed_by_name}</span>
                    </td>
                    <td className={cn(tdCls, "text-slate-600")}>
                      {i.summary ? (
                        <span>{i.summary}</span>
                      ) : (
                        <span className="text-slate-400 italic">No summary provided</span>
                      )}
                    </td>
                    <td className={cn(tdCls, "text-right")}>
                      <Link className={btnClass("default", "sm")} to={`/inspections/${i.id}`}>
                        View details →
                      </Link>
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className={cn(tdCls, mutedCls, "text-center py-10")}>
                      No checkup records found.
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
