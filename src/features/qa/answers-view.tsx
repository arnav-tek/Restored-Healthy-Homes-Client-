import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import type { PublicAnswer } from "@/domain/qa";

function formatSpecialtyTitle(categoryName?: string): string {
  if (!categoryName) return "Healthy Home Specialist";
  if (categoryName.includes("Designers")) return "Healthy Home Designer";
  if (categoryName.includes("Builders")) return "Healthy Home Builder";
  if (categoryName.includes("Trades")) return "Healthy Home Trade Specialist";
  if (categoryName.includes("Renovations"))
    return "Healthy Home Renovation Specialist";
  if (
    categoryName.includes("Inspectors") ||
    categoryName.includes("Inspection")
  )
    return "Mold Testing / Inspector";
  if (categoryName.includes("Remediation"))
    return "Mold Remediation Specialist";
  if (categoryName.includes("Practitioners")) return "Health Practitioner";
  if (categoryName.includes("Detection Dogs"))
    return "Canine Mold Detection Team";
  return categoryName.replace(/s$/, "");
}

export function AnswersView({
  answers,
  categoryName,
}: {
  answers: readonly PublicAnswer[];
  categoryName?: string;
}) {
  const specialtyTitle = formatSpecialtyTitle(categoryName);

  return (
    <section aria-labelledby="answers-heading" className="qa-answers-section">
      <div className="qa-answers-header-row">
        <h2 id="answers-heading" className="qa-answers-heading">
          Published answers ({answers.length})
        </h2>
        <div className="qa-answers-header-line" aria-hidden="true" />
      </div>

      {answers.length ? (
        <div className="qa-answers-list">
          {answers.map((answer) => {
            const paragraphs = answer.body.split(/\n\s*\n/).filter(Boolean);
            return (
              <article key={answer.id} className="qa-answer-card">
                <div className="qa-answer-card-header">
                  <div className="qa-answer-author-wrap">
                    <div className="qa-answer-avatar" aria-hidden="true">
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h3 className="qa-answer-author">{answer.attribution}</h3>
                      <p className="qa-answer-specialty">{specialtyTitle}</p>
                    </div>
                  </div>
                  <span className="qa-answer-badge">Published answer</span>
                </div>

                <div className="qa-answer-body">
                  {paragraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>

                {answer.profileHref && (
                  <div className="qa-answer-footer">
                    <Link
                      className="qa-answer-profile-link"
                      href={answer.profileHref}
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                      <span>View professional profile</span>
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="qa-no-answers-card">
          <h3 className="qa-no-answers-title">No published answers yet</h3>
          <p className="qa-no-answers-desc">
            There are no published answers to this question yet.
          </p>
        </div>
      )}
    </section>
  );
}
