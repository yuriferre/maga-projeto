import type { Lesson } from "../../../shared/schema.ts";
import { ExerciseList } from "../exercises/ExerciseList.tsx";

export function Quiz({ lesson }: { lesson: Lesson }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Quiz</h2>
      <p className="text-sm text-slate-600">{lesson.quiz.length} itens. Conta a última tentativa de cada item; mínimo {Math.round(lesson.completion.quizMin * 100)}% para concluir. Pode refazer.</p>
      <ExerciseList lessonId={lesson.id} block="quiz" exercises={lesson.quiz} />
    </section>
  );
}
