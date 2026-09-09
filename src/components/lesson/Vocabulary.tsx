import type { Lesson } from "../../../shared/schema.ts";
import { Badge } from "../ui/Badge.tsx";
import { SpeakButton } from "./SpeakButton.tsx";

const registerTone = { formal: "amber", neutral: "neutral", informal: "blue" } as const;

export function Vocabulary({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Vocabulário e expressões essenciais</h2>
      <p className="text-sm text-slate-500">{lesson.vocabulary.length} expressões. Ouça cada uma e repita em voz alta.</p>
      <ol className="space-y-3">
        {lesson.vocabulary.map((v, i) => (
          <li key={i} className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-medium">{i + 1}. {v.term}</span>
              <span className="flex items-center gap-2">
                <Badge tone={registerTone[v.register]}>{v.register}</Badge>
                <SpeakButton text={v.example} small />
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-600">{v.meaning}</div>
            <div className="mt-2 text-slate-800">“{v.example}”</div>
            {v.translation && <div className="text-sm text-slate-500">{v.translation}</div>}
            {v.note && <div className="mt-1 text-sm text-amber-800">{v.note}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
