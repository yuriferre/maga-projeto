import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { openDb } from "./db.ts";
import { mountStatic } from "./static.ts";
import { loadContent, crossValidate } from "../shared/content-loader.ts";

const port = Number(process.env.PORT ?? 3001);
const dbPath = process.env.DB_PATH ?? "data/progress.sqlite";
const distDir = process.env.STATIC_DIR ?? "dist";

const content = loadContent("content");
const problems = crossValidate(content);
if (problems.length > 0) {
  console.error(`Conteúdo inválido:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

const db = openDb(dbPath);
const app = createApp({ db, content });
// Em produção (container) o mesmo processo serve a UI compilada; em dev o Vite faz isso.
const servingUi = mountStatic(app, distDir);

serve({ fetch: app.fetch, port }, () => {
  console.log(`[server] http://localhost:${port} · banco: ${dbPath} · ${Object.keys(content.lessons).length} aula(s)${servingUi ? ` · UI em ${distDir}/` : ""}`);
});
