import type { Lesson } from "../../../shared/schema.ts";
import { Markdown } from "../ui/Markdown.tsx";
import { SpeakButton } from "./SpeakButton.tsx";

export function Grammar({ lesson }: { lesson: Lesson }) {
  if (!lesson.grammar) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Gramática (só o necessário)</h2>
      <h3 className="font-medium text-slate-800">{lesson.grammar.title}</h3>
      <Markdown text={lesson.grammar.explanation} />
      {lesson.grammar.examples.length > 0 && (
        <ul className="space-y-1 text-sm">
          {lesson.grammar.examples.map((e, i) => <li key={i} className="flex items-center gap-2"><SpeakButton text={e.en} small /><span className="font-medium">{e.en}</span><span className="text-slate-500">— {e.pt}</span></li>)}
        </ul>
      )}
    </section>
  );
}
