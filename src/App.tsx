import type { ReactNode } from "react";
import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { P } from "./api";
import { useAuth } from "./auth";
import { Button, Card, Loading, cn } from "./ui";
import Login from "./pages/Login";
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
    return <Card>You don't have access to this page. Ask an admin to grant the permission.</Card>;
  return <>{children}</>;
}

function Layout() {
  const { user, logout, can } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    cn("text-sm hover:text-white", isActive ? "font-semibold text-white underline underline-offset-4" : "text-sky-100");
  return (
    <>
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-brand-dark px-5 py-2.5 text-white">
        <span className="text-lg font-bold">💧 WaterCare</span>
        <NavLink to="/" end className={link}>Machines</NavLink>
        {can(P.INSPECTIONS_VIEW) && <NavLink to="/inspections" className={link}>Checkups</NavLink>}
        {can(P.CHECKLISTS_MANAGE) && <NavLink to="/admin/checklists" className={link}>Checklists</NavLink>}
        {user?.role === "admin" && <NavLink to="/admin/users" className={link}>Users</NavLink>}
        <span className="flex-1" />
        <span className="text-sm">{user?.full_name}{user?.role === "admin" && " (admin)"}</span>
        <Button size="sm" className="!bg-transparent !text-white !border-white/40 hover:!bg-white/10" onClick={logout}>Log out</Button>
      </header>
      <main className="mx-auto my-5 max-w-5xl px-4"><Outlet /></main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Guard><Layout /></Guard>}>
        <Route index element={<Guard perms={[P.MACHINES_VIEW, P.INSPECTIONS_VIEW, P.INSPECTIONS_CREATE]}><Machines /></Guard>} />
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
