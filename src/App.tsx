import type { ReactNode } from "react";
import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { P } from "./api";
import { useAuth } from "./auth";
import { Loading, cn } from "./ui";
import Login from "./pages/Login";
import Plants from "./pages/Plants";
import PlantDetail from "./pages/PlantDetail";
import Machines from "./pages/Machines";
import MachineDetail from "./pages/MachineDetail";
import NewInspection from "./pages/NewInspection";
import InspectionView from "./pages/InspectionView";
import Inspections from "./pages/Inspections";
import Users from "./pages/Users";
import Checklists from "./pages/Checklists";

function Guard({ children, perms, admin }: { children: ReactNode; perms?: string[]; admin?: boolean }) {
  const { user, loading, can } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if ((admin && user.role !== "admin") || (perms && !can(...perms)))
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-900 shadow-xs max-w-lg mx-auto mt-12 text-center">
        <div className="text-2xl mb-2">🔒</div>
        <h3 className="font-bold text-base mb-1">Access Restricted</h3>
        <p>You don't have access to this page. Ask an administrator to grant the required permissions.</p>
      </div>
    );
  return <>{children}</>;
}

function Layout() {
  const { user, logout, can } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 inline-flex items-center gap-1.5",
      isActive
        ? "bg-sky-50 text-sky-700 shadow-2xs ring-1 ring-sky-200/80"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
    );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center text-lg shadow-sm shadow-sky-500/25 group-hover:scale-105 transition-transform">
                💧
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 tracking-tight text-base leading-tight">WaterCare</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-sky-600">Operations</span>
              </div>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={link}>
                
                <span>Plants</span>
              </NavLink>
              {can(P.INSPECTIONS_VIEW) && (
                <NavLink to="/inspections" className={link}>
                  
                  <span>Checkups</span>
                </NavLink>
              )}
              {can(P.CHECKLISTS_MANAGE) && (
                <NavLink to="/admin/checklists" className={link}>
                  
                  <span>Checklists</span>
                </NavLink>
              )}
              {user?.role === "admin" && (
                <NavLink to="/admin/users" className={link}>
                  
                  <span>Users</span>
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center border border-sky-200 shadow-2xs">
                {user?.full_name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name}</span>
                <span className="text-[11px] text-slate-400 capitalize">
                  {user?.role === "admin" ? (
                    <span className="text-sky-600 font-medium">Administrator</span>
                  ) : (
                    "Operator"
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
              title="Log out"
            >
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden flex items-center gap-1.5 px-4 py-2 border-t border-slate-100 overflow-x-auto bg-slate-50/70">
          <NavLink to="/" end className={link}> Plants</NavLink>
          {can(P.INSPECTIONS_VIEW) && <NavLink to="/inspections" className={link}> Checkups</NavLink>}
          {can(P.CHECKLISTS_MANAGE) && <NavLink to="/admin/checklists" className={link}> Checklists</NavLink>}
          {user?.role === "admin" && <NavLink to="/admin/users" className={link}> Users</NavLink>}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* <Route path="/login" element={<Login />} /> */}
      <Route element={<Guard><Layout /></Guard>}>
        <Route index element={<Guard perms={[P.PLANTS_VIEW, P.MACHINES_VIEW, P.INSPECTIONS_VIEW, P.INSPECTIONS_CREATE]}><Plants /></Guard>} />
        <Route path="plants/:id" element={<Guard perms={[P.PLANTS_VIEW, P.MACHINES_VIEW, P.INSPECTIONS_VIEW, P.INSPECTIONS_CREATE]}><PlantDetail /></Guard>} />
        <Route path="machines" element={<Guard perms={[P.MACHINES_VIEW, P.INSPECTIONS_VIEW, P.INSPECTIONS_CREATE]}><Machines /></Guard>} />
        <Route path="machines/:id" element={<Guard perms={[P.MACHINES_VIEW, P.INSPECTIONS_VIEW, P.INSPECTIONS_CREATE]}><MachineDetail /></Guard>} />
        <Route path="machines/:id/checkup" element={<Guard perms={[P.INSPECTIONS_CREATE]}><NewInspection /></Guard>} />
        <Route path="inspections" element={<Guard perms={[P.INSPECTIONS_VIEW]}><Inspections /></Guard>} />
        <Route path="inspections/:id" element={<Guard perms={[P.INSPECTIONS_VIEW]}><InspectionView /></Guard>} />
        <Route path="admin/checklists" element={<Guard perms={[P.CHECKLISTS_MANAGE]}><Checklists /></Guard>} />
        <Route path="admin/users" element={<Guard admin><Users /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
