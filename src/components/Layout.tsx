import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-lg font-semibold text-slate-900">Inglês para Tecnologia</Link>
          <nav className="text-sm text-slate-600">
            <Link to="/" className="hover:text-indigo-700">Trilha</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
