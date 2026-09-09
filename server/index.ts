import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { openDb } from "./db.ts";
import { loadContent, crossValidate } from "../shared/content-loader.ts";

const port = Number(process.env.PORT ?? 3001);
const dbPath = process.env.DB_PATH ?? "data/progress.sqlite";

const content = loadContent("content");
const problems = crossValidate(content);
if (problems.length > 0) {
  console.error(`Conteúdo inválido:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

const db = openDb(dbPath);
const app = createApp({ db, content });

serve({ fetch: app.fetch, port }, () => {
  console.log(`[server] http://localhost:${port} · banco: ${dbPath} · ${Object.keys(content.lessons).length} aula(s)`);
});
