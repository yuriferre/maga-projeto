import { loadContent, crossValidate } from "../shared/content-loader.ts";

try {
  const bundle = loadContent("content");
  const problems = crossValidate(bundle);
  if (problems.length > 0) {
    console.error(`Conteúdo com ${problems.length} problema(s):\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  const lessonCount = Object.keys(bundle.lessons).length;
  console.log(`ok: ${bundle.levels.length} níveis, ${lessonCount} aula(s) com conteúdo, ${bundle.tags.length} tags, ${bundle.brErrors.length} padrões de erro`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
