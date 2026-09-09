import { Link, useParams } from "react-router";
import { findModule, hasContent, competencyLabel } from "../lib/content.ts";
import { useOverview } from "../lib/useOverview.ts";
import { Card } from "../components/ui/Card.tsx";
import { Badge } from "../components/ui/Badge.tsx";

export function Module() {
  const { id = "" } = useParams();
  const found = findModule(id);
  const { byLesson } = useOverview();

  if (!found) return <p className="text-rose-700">Módulo não encontrado.</p>;
  const { level, module } = found;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-indigo-700 hover:underline">← Trilha</Link>
        <h1 className="mt-2 text-2xl font-semibold">{module.id} · {module.title}</h1>
        <p className="text-sm text-slate-500">Nível {level.id} · {level.name}</p>
      </div>

      <Card>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2"><dt className="font-medium text-slate-700">Objetivo</dt><dd className="text-slate-600">{module.objective}</dd></div>
          <div><dt className="font-medium text-slate-700">Competências</dt><dd className="mt-1 flex flex-wrap gap-1">{module.competencies.map((c) => <Badge key={c} tone="blue">{competencyLabel[c] ?? c}</Badge>)}</dd></div>
          <div><dt className="font-medium text-slate-700">Pré-requisitos</dt><dd className="text-slate-600">{module.prerequisites.length ? module.prerequisites.join(", ") : "nenhum"}</dd></div>
          <div><dt className="font-medium text-slate-700">Critério de conclusão</dt><dd className="text-slate-600">{module.completion}</dd></div>
          <div><dt className="font-medium text-slate-700">Como medir a evolução</dt><dd className="text-slate-600">{module.evaluation}</dd></div>
        </dl>
      </Card>

      <ol className="space-y-2">
        {module.lessons.map((l, i) => {
          const available = hasContent(l.id);
          const status = byLesson.get(l.id)?.status;
          const inner = (
            <div className="flex items-center justify-between gap-3">
              <span><span className="mr-2 text-slate-400">{i + 1}.</span>{l.title}</span>
              <span className="flex gap-1">
                {l.simulation && <Badge tone="amber">simulação</Badge>}
                {status === "completed" ? <Badge tone="green">concluída</Badge> : status === "in_progress" ? <Badge tone="blue">em andamento</Badge> : available ? <Badge tone="neutral">disponível</Badge> : <Badge>em breve</Badge>}
              </span>
            </div>
          );
          return (
            <li key={l.id}>
              {available
                ? <Link to={`/lessons/${l.id}`} className="block rounded-md border border-slate-200 bg-white p-3 hover:border-indigo-400 hover:bg-indigo-50">{inner}</Link>
                : <div className="rounded-md border border-dashed border-slate-200 p-3 text-slate-500">{inner}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
