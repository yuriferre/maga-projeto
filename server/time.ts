// Calendário no fuso local da máquina (uso pessoal, um computador). Datas locais são strings YYYY-MM-DD.
const pad = (n: number) => String(n).padStart(2, "0");

function fromLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Data local (YYYY-MM-DD) de um instante ISO. */
export function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, n: number): string {
  const d = fromLocalDate(date);
  d.setDate(d.getDate() + n);
  return localDate(d.toISOString());
}

/** Segunda-feira local da semana que contém o instante. */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const sinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - sinceMonday);
  return localDate(d.toISOString());
}

/** Início (inclusivo) e fim (exclusivo) da semana local, como instantes ISO. */
export function weekBounds(weekStartDate: string): { start: string; end: string } {
  return { start: fromLocalDate(weekStartDate).toISOString(), end: fromLocalDate(addDays(weekStartDate, 7)).toISOString() };
}

/** Milissegundos da interseção de [aStart, aEnd) com [bStart, bEnd). */
export function overlapMs(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const s = Math.max(Date.parse(aStart), Date.parse(bStart));
  const e = Math.min(Date.parse(aEnd), Date.parse(bEnd));
  return e > s ? e - s : 0;
}

/** Streak a partir das datas locais com atividade. `current` conta até hoje, ou até ontem se hoje ainda não teve atividade. */
export function computeStreak(days: string[], today: string): { current: number; best: number; activeToday: boolean } {
  const set = new Set(days);
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...set].sort()) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const activeToday = set.has(today);
  let current = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best, activeToday };
}
