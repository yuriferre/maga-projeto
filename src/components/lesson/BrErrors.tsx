import type { Lesson } from "../../../shared/schema.ts";

export function BrErrors({ lesson }: { lesson: Lesson }) {
  if (lesson.brErrors.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Erros comuns de brasileiros nesta situação</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="px-2 py-1">Errado</th><th className="px-2 py-1">Certo</th><th className="px-2 py-1">Por quê</th></tr></thead>
          <tbody>
            {lesson.brErrors.map((e, i) => (
              <tr key={i} className="odd:bg-slate-50">
                <td className="px-2 py-2 text-rose-800 line-through decoration-rose-300">{e.wrong}</td>
                <td className="px-2 py-2 font-medium text-emerald-800">{e.right}</td>
                <td className="px-2 py-2 text-slate-600">{e.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
