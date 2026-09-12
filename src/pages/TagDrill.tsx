import { Link, useParams } from "react-router";
import { content, lessonExercises, tagLabel } from "../lib/content.ts";
import { Card } from "../components/ui/Card.tsx";
import { ExerciseList } from "../components/exercises/ExerciseList.tsx";

/** Exercícios extras de uma tag, agrupados pela aula de origem ("refazer exercícios de aula Y"). */
export function TagDrill() {
  const { tag = "" } = useParams();
  const groups = Object.values(content.lessons)
    .sort((a, b) => a.module.localeCompare(b.module) || a.order - b.order)
    .map((lesson) => ({ lesson, items: lessonExercises(lesson).filter((e) => e.tags.includes(tag)) }))
    .filter((g) => g.items.length > 0);
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm text-indigo-700 hover:underline">← painel</Link>
      <div>
        <h1 className="text-2xl font-semibold">{tagLabel(tag)}</h1>
        <p className="mt-1 text-sm text-slate-600">
          <code className="text-xs">{tag}</code> · {total} item(ns) em {groups.length} aula(s). As tentativas contam como revisão da aula de origem e alimentam as estatísticas da tag.
        </p>
      </div>
      {total === 0 && <Card><p className="text-sm text-slate-600">Nenhum exercício com esta tag no conteúdo disponível.</p></Card>}
      {groups.map(({ lesson, items }) => (
        <Card key={lesson.id}>
          <h2 className="font-medium">
            <Link to={`/lessons/${lesson.id}`} className="text-indigo-700 hover:underline">{lesson.id} · {lesson.title}</Link>
            <span className="ml-2 text-sm font-normal text-slate-500">{items.length} item(ns)</span>
          </h2>
          <div className="mt-3">
            <ExerciseList lessonId={lesson.id} block="warmup" exercises={items} />
          </div>
        </Card>
      ))}
    </div>
  );
}
