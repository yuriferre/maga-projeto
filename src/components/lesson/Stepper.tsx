type Step = { key: string; label: string };

export function Stepper({ steps, current, onSelect, readOnly = false }: { steps: Step[]; current: number; onSelect(i: number): void; readOnly?: boolean }) {
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {steps.map((s, i) => {
        const cls = `rounded-full px-3 py-1 ${i === current ? "bg-indigo-600 text-white" : i < current ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"}`;
        return (
          <li key={s.key}>
            {readOnly
              ? <span aria-current={i === current ? "step" : undefined} className={cls}>{i + 1}. {s.label}</span>
              : <button type="button" onClick={() => onSelect(i)} aria-current={i === current ? "step" : undefined} className={`${cls} ${i === current ? "" : "hover:bg-slate-200"}`}>{i + 1}. {s.label}</button>}
          </li>
        );
      })}
    </ol>
  );
}
