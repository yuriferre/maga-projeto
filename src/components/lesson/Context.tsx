import type { Lesson } from "../../../shared/schema.ts";
import { Markdown } from "../ui/Markdown.tsx";

export function Context({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Contexto profissional real</h2>
      <Markdown text={lesson.context.scenario} className="text-base" />
      {lesson.context.roles.length > 0 && <p className="text-sm text-slate-500">Personagens: {lesson.context.roles.join(" · ")}</p>}
    </section>
  );
}
