import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.ts";
import { openDb } from "../server/db.ts";
import { loadContent } from "../shared/content-loader.ts";
import { mountStatic } from "../server/static.ts";

const content = loadContent("content");

/** Um dist/ mínimo: index.html + um asset. */
function fakeDist(): string {
  const dir = mkdtempSync(join(tmpdir(), "dist-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), "<!doctype html><title>spa</title>");
  writeFileSync(join(dir, "assets", "app.js"), "console.log(1)");
  return dir;
}

describe("mountStatic", () => {
  it("serves dist files and falls back to index.html for SPA routes, never for /api", async () => {
    const app = createApp({ db: openDb(":memory:"), content });
    expect(mountStatic(app, fakeDist())).toBe(true);
    expect(await (await app.request("/")).text()).toContain("<title>spa</title>");
    const asset = await app.request("/assets/app.js");
    expect(await asset.text()).toBe("console.log(1)");
    expect(asset.headers.get("content-type")).toContain("javascript");
    expect(await (await app.request("/review")).text()).toContain("<title>spa</title>");
    expect((await app.request("/api/health")).status).toBe(200);
    const missing = await app.request("/api/nope");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "rota não encontrada" });
  });

  it("is a no-op when there is no index.html", async () => {
    const app = createApp({ db: openDb(":memory:"), content });
    expect(mountStatic(app, mkdtempSync(join(tmpdir(), "empty-")))).toBe(false);
    expect((await app.request("/")).status).toBe(404);
  });
});
