import type { Lesson } from "../../../shared/schema.ts";
import { Badge } from "../ui/Badge.tsx";
import { competencyLabel } from "../../lib/content.ts";

export function Objective({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Objetivo da aula</h2>
      <p className="text-lg text-slate-700">{lesson.objective}</p>
      <div className="flex flex-wrap gap-2 text-sm">
        {lesson.competencies.map((c) => <Badge key={c} tone="blue">{competencyLabel[c] ?? c}</Badge>)}
        <Badge>{lesson.durationMin} min</Badge>
        {lesson.prerequisites.length > 0 && <Badge tone="amber">pré-requisito: {lesson.prerequisites.join(", ")}</Badge>}
      </div>
      <div className="text-sm text-slate-600">
        <span className="font-medium">Para concluir:</span> quiz ≥ {Math.round(lesson.completion.quizMin * 100)}% · escrita com nota ≥ {lesson.completion.writingMin} · {lesson.completion.speakingRequired ? "1 gravação de fala" : "fala opcional"} · {lesson.srsCards.length} cards para o SRS
      </div>
    </section>
  );
}
