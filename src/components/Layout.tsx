import { NavLink, Outlet } from "react-router";
import { useStudyHeartbeat } from "../lib/useStudyHeartbeat.ts";

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "font-medium text-indigo-700" : "hover:text-indigo-700");

export function Layout() {
  useStudyHeartbeat();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <NavLink to="/" className="text-lg font-semibold text-slate-900">Inglês para Tecnologia</NavLink>
          <nav className="flex gap-4 text-sm text-slate-600">
            <NavLink to="/" end className={linkClass}>Painel</NavLink>
            <NavLink to="/trilha" className={linkClass}>Trilha</NavLink>
            <NavLink to="/placement" className={linkClass}>Teste inicial</NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
