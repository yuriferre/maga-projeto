import type { Lesson } from "../../../shared/schema.ts";
import { SpeakButton } from "./SpeakButton.tsx";

export function Examples({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Exemplos naturais</h2>
        <ul className="mt-3 space-y-3">
          {lesson.examples.map((e, i) => (
            <li key={i} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2"><span className="text-slate-900">{e.en}</span><SpeakButton text={e.en} small /></div>
              <div className="text-sm text-slate-500">{e.pt}</div>
              <div className="mt-1 text-xs text-slate-500"><span className="font-medium">Quando usar:</span> {e.context}</div>
            </li>
          ))}
        </ul>
      </div>
      {lesson.variations.map((v, i) => (
        <div key={i}>
          <h3 className="font-medium text-slate-800">Variações da mesma ideia: {v.idea}</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {v.items.map((it, j) => (
                <tr key={j} className={it.adequate ? "" : "bg-rose-50"}>
                  <td className="w-40 px-2 py-1 align-top text-slate-500">{it.register}</td>
                  <td className="px-2 py-1">{it.adequate ? "✓" : "✗"} {it.text}{it.note && <span className="ml-2 text-xs text-slate-500">— {it.note}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
