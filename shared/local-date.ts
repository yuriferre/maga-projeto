// Calendário no fuso local da máquina (uso pessoal, um computador). Datas locais são strings YYYY-MM-DD.
const pad = (n: number) => String(n).padStart(2, "0");

export function fromLocalDate(date: string): Date {
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

/** Instante ISO da meia-noite local da data. */
export function localDayStart(date: string): string {
  return fromLocalDate(date).toISOString();
}
