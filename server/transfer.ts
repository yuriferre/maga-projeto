import { z } from "zod";
import type { Db } from "./db.ts";

/** Tabelas de dados exportáveis, na ordem de restore (srs_reviews depois de srs_cards pela FK). */
const TABLES = [
  "lesson_progress",
  "attempts",
  "writing_submissions",
  "speaking_sessions",
  "srs_cards",
  "srs_reviews",
  "assessments",
  "weekly_goals",
  "study_sessions",
  "settings",
] as const;
type TableName = (typeof TABLES)[number];

export type ExportFile = { version: 1; exportedAt: string; tables: Record<TableName, Array<Record<string, unknown>>> };

const columnsCache = new WeakMap<Db, Map<TableName, string[]>>();
function columnsOf(db: Db, table: TableName): string[] {
  let cache = columnsCache.get(db);
  if (!cache) columnsCache.set(db, (cache = new Map()));
  const hit = cache.get(table);
  if (hit) return hit;
  const cols = (db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>).map((c) => c.name);
  cache.set(table, cols);
  return cols;
}

/** Dump JSON de todas as tabelas de dados (ids e timestamps preservados). */
export function exportDb(db: Db, exportedAt: string): ExportFile {
  const tables = {} as ExportFile["tables"];
  for (const t of TABLES) tables[t] = db.prepare(`select * from ${t} order by rowid`).all() as Array<Record<string, unknown>>;
  return { version: 1, exportedAt, tables };
}

const ImportFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
export type ImportFile = z.infer<typeof ImportFileSchema>;
export const parseImportFile = (body: unknown) => ImportFileSchema.safeParse(body);

/**
 * Restore: apaga as tabelas de dados e reinsere as linhas do arquivo, preservando
 * ids/timestamps. Rejeita tabelas desconhecidas e colunas que não existem no schema.
 * Lança Error com mensagem legível para a rota devolver 400.
 */
export function importDb(db: Db, file: ImportFile): Record<TableName, number> {
  const unknownTables = Object.keys(file.tables).filter((t) => !(TABLES as readonly string[]).includes(t));
  if (unknownTables.length > 0) throw new Error(`tabelas desconhecidas: ${unknownTables.join(", ")}`);

  for (const [table, rows] of Object.entries(file.tables)) {
    const cols = columnsOf(db, table as TableName);
    for (const row of rows) {
      const bad = Object.keys(row).filter((k) => !cols.includes(k));
      if (bad.length > 0) throw new Error(`colunas desconhecidas em ${table}: ${bad.join(", ")}`);
    }
  }

  const counts = {} as Record<TableName, number>;
  db.exec("begin");
  try {
    for (const t of [...TABLES].reverse()) db.prepare(`delete from ${t}`).run();
    for (const t of TABLES) {
      const rows = file.tables[t] ?? [];
      const cols = columnsOf(db, t);
      const stmt = db.prepare(`insert into ${t} (${cols.join(",")}) values (${cols.map(() => "?").join(",")})`);
      for (const row of rows) stmt.run(...cols.map((c) => (row[c] === undefined ? null : row[c]) as string | number | null));
      counts[t] = rows.length;
    }
    db.exec("commit");
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
  return counts;
}
