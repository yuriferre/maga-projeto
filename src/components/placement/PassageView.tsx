import type { PlacementPassage } from "../../../shared/schema.ts";
import { Markdown } from "../ui/Markdown.tsx";

export function PassageView({ passage }: { passage: PlacementPassage }) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">{passage.title}</h3>
      <p className="text-xs text-slate-500">{passage.source}</p>
      {passage.format === "pre"
        ? <pre className="overflow-x-auto rounded-md bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{passage.text}</pre>
        : <div className="rounded-md border border-slate-200 bg-white p-4"><Markdown text={passage.text} /></div>}
    </div>
  );
}
