type Step = { key: string; label: string };

export function Stepper({ steps, current, onSelect }: { steps: Step[]; current: number; onSelect(i: number): void }) {
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {steps.map((s, i) => (
        <li key={s.key}>
          <button
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === current ? "step" : undefined}
            className={`rounded-full px-3 py-1 ${i === current ? "bg-indigo-600 text-white" : i < current ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {i + 1}. {s.label}
          </button>
        </li>
      ))}
    </ol>
  );
}
