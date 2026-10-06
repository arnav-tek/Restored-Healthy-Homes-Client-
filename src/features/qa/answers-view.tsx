import Link from "next/link";
import type { PublicAnswer } from "@/domain/qa";
export function AnswersView({ answers }: { answers: readonly PublicAnswer[] }) {
  return (
    <section aria-labelledby="answers-heading" className="qa-answers">
      <h2 id="answers-heading">Published answers ({answers.length})</h2>
      {answers.length ? (
        answers.map((answer) => (
          <article key={answer.id} className="qa-answer">
            <h3>{answer.attribution}</h3>

            <p>{answer.body}</p>
            {answer.profileHref && (
              <Link className="text-link" href={answer.profileHref}>
                View professional profile
              </Link>
            )}
          </article>
        ))
      ) : (
        <div className="workspace-empty">
          <h3>No published answers yet</h3>
          <p>There are no published answers to this question yet.</p>
        </div>
      )}
    </section>
  );
}
