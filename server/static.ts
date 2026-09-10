import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

/**
 * Serve o build do cliente (dist/) pelo mesmo servidor da API: arquivos estáticos e,
 * para qualquer rota do SPA, o index.html. Rotas /api/* desconhecidas continuam 404 em JSON.
 * Devolve false (sem montar nada) quando não há index.html — em desenvolvimento o Vite serve a UI.
 */
export function mountStatic(app: Hono, distDir: string): boolean {
  const indexPath = join(distDir, "index.html");
  if (!existsSync(indexPath)) return false;
  const spa = serveStatic({ path: indexPath });
  app.use("/*", serveStatic({ root: distDir }));
  app.get("*", async (c, next) => {
    if (c.req.path.startsWith("/api/")) return c.json({ error: "rota não encontrada" }, 404);
    // serveStatic devolve undefined quando o arquivo não existe (impossível aqui: index.html foi checado acima).
    return (await spa(c, next)) ?? c.notFound();
  });
  return true;
}
