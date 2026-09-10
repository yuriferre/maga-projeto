export type RadarAxis = { key: string; label: string; value: number | null };

/** Radar SVG inline, 7 eixos por padrão. Eixo sem dado fica em 0 e é listado abaixo do gráfico. */
export function RadarChart({ axes, size = 280 }: { axes: RadarAxis[]; size?: number }) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 40;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const point = (i: number, v: number) => ({ x: cx + r * v * Math.cos(angle(i)), y: cy + r * v * Math.sin(angle(i)) });
  const ring = (v: number) => axes.map((_, i) => point(i, v)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const polygon = axes.map((a, i) => point(i, a.value ?? 0)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const missing = axes.filter((a) => a.value === null).map((a) => a.label);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-xs" role="img" aria-label="Radar de competências">
        {[0.25, 0.5, 0.75, 1].map((v) => <polygon key={v} points={ring(v)} fill="none" stroke="#e2e8f0" strokeWidth={1} />)}
        {axes.map((_, i) => { const p = point(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={1} />; })}
        <polygon points={polygon} fill="rgba(79, 70, 229, 0.25)" stroke="#4f46e5" strokeWidth={2} />
        {axes.map((a, i) => {
          const p = point(i, a.value ?? 0);
          const l = point(i, 1.18);
          return (
            <g key={a.key}>
              <circle cx={p.x} cy={p.y} r={3} fill={a.value === null ? "#cbd5e1" : "#4f46e5"} />
              <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600" fontSize={11}>
                {a.label}{a.value === null ? "" : ` ${Math.round(a.value * 100)}%`}
              </text>
            </g>
          );
        })}
      </svg>
      {missing.length > 0 && <p className="text-center text-xs text-slate-500">Sem dados: {missing.join(", ")}.</p>}
    </div>
  );
}
