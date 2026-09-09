import type { Exercise, Lesson } from "../../../shared/schema.ts";
import { ExerciseList } from "../exercises/ExerciseList.tsx";

export function WarmUp({ lesson, items }: { lesson: Lesson; items: Exercise[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Revisão espaçada</h2>
      <p className="text-sm text-slate-600">{items.length} itens de aulas anteriores, escolhidos pelas tags em que você mais errou e pelo tempo desde a última vez.</p>
      <ExerciseList lessonId={lesson.id} block="warmup" exercises={items} />
    </section>
  );
}
