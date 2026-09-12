import { Link } from "react-router";
import { levels, hasContent, content } from "../lib/content.ts";
import { useOverview } from "../lib/useOverview.ts";
import { Card } from "../components/ui/Card.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { ProgressBar } from "../components/ui/ProgressBar.tsx";

export function Levels() {
  const { byLesson, modules, error } = useOverview();
  const moduleCount = levels.reduce((sum, level) => sum + level.modules.length, 0);
  const lessonCount = levels.reduce((sum, level) => sum + level.modules.reduce((s, m) => s + m.lessons.length, 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trilha</h1>
        <p className="mt-1 text-slate-600">{levels.length} níveis · {moduleCount} módulos · {lessonCount} aulas. Módulos dentro de um nível podem ser feitos em qualquer ordem.</p>
        {error && <p className="mt-2 text-sm text-rose-700">Servidor não respondeu ({error}). Progresso indisponível.</p>}
      </div>

      {levels.map((level) => {
        const lessonIds = level.modules.flatMap((m) => m.lessons.map((l) => l.id));
        const done = lessonIds.filter((id) => byLesson.get(id)?.status === "completed").length;
        return (
          <Card key={level.id}>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold">Nível {level.id} · {level.name} <span className="font-normal text-slate-500">— {level.subtitle}</span></h2>
              <span className="text-sm text-slate-500">{done}/{lessonIds.length} aulas</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{level.focus}</p>
            <div className="mt-2"><ProgressBar value={lessonIds.length ? done / lessonIds.length : 0} /></div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {level.modules.map((m) => {
                const available = m.lessons.filter((l) => hasContent(l.id)).length;
                const completed = m.lessons.filter((l) => byLesson.get(l.id)?.status === "completed").length;
                return (
                  <li key={m.id}>
                    <Link to={`/modules/${m.id}`} className="block rounded-md border border-slate-200 p-3 hover:border-indigo-400 hover:bg-indigo-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{m.id} · {m.title}</span>
                        <span className="flex items-center gap-1">
                          {modules[m.id]?.passed && <Badge tone="green">aprovado</Badge>}
                          {available === 0 ? <Badge>em breve</Badge> : completed === m.lessons.length ? <Badge tone="green">concluído</Badge> : <Badge tone="blue">{available} aula(s) disponíveis</Badge>}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{m.lessons.length} aulas · {completed} concluídas</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {content.levelAssessments[`L${level.id}`] && (() => {
              const approved = level.modules.filter((m) => modules[m.id]?.passed).length;
              const open = approved === level.modules.length;
              return (
                <Link
                  to={open ? `/levels/${level.id}/assessment` : "#"}
                  aria-disabled={!open}
                  className={`mt-4 flex items-center justify-between rounded-md border p-3 text-sm ${open ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-800 hover:border-indigo-400" : "pointer-events-none border-slate-200 text-slate-400"}`}
                >
                  <span>Avaliação do nível {level.id}</span>
                  {open ? <Badge tone="blue">30 itens + escrita + fala</Badge> : <Badge>{approved}/{level.modules.length} módulos aprovados</Badge>}
                </Link>
              );
            })()}
          </Card>
        );
      })}
    </div>
  );
}
