import { mkdirSync, writeFileSync } from "node:fs";
import { loadContent, crossValidate } from "../shared/content-loader.ts";

try {
  const bundle = loadContent("content");
  const problems = crossValidate(bundle);
  if (problems.length > 0) {
    console.error(`Conteúdo com ${problems.length} problema(s):\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  mkdirSync("src/generated", { recursive: true });
  writeFileSync("src/generated/content.json", JSON.stringify(bundle, null, 2));
  console.log(`gerado src/generated/content.json (${Object.keys(bundle.lessons).length} aula(s) com conteúdo)`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
