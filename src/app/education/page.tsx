import type { Metadata } from "next";
import Link from "next/link";
import { directoryRepository } from "@/data";
import { getEducationPathways } from "@/data/content/education";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Education & Certifications",
  description:
    "Explore external education and certification pathways for healthy-home professionals, with provider references and guidance on choosing a specialty.",
};

export default async function EducationPage() {
  const pathways = getEducationPathways(
    await directoryRepository.getCategories(),
  );
  return (
    <div className="learning-page container">
      <header className="public-page-intro">
        <div>
          <p className="public-eyebrow">For professionals</p>
          <h1>
            Grow your knowledge.
            <br />
            Choose your path.
          </h1>
        </div>
        <div className="public-intro-copy">
          <p>
            Explore education and certification options for your specialty.
            Restored Healthy Homes connects professionals to external providers;
            we do not train or certify professionals.
          </p>
          <p>
            A course completion certificate, a professional certification and a
            license serve different purposes. Check requirements for your work
            and location.
          </p>
        </div>
      </header>
      <nav className="pathway-index" aria-label="Education categories">
        {pathways.map(({ category }) => (
          <a key={category.id} href={`#pathway-${category.id}`}>
            {category.name}
          </a>
        ))}
      </nav>
      <section aria-labelledby="pathways-heading" className="pathways-section">
        <div className="public-section-heading">
          <h2 id="pathways-heading">Explore your specialty</h2>
          <p>
            Open a pathway for options and next steps. These references are
            starting points, not directory requirements or endorsements. Program
            selections, typical timelines and total costs are to be confirmed.
          </p>
        </div>
        <div className="pathway-list">
          {pathways.map(({ category, pathway }) => (
            <details
              key={category.id}
              id={`pathway-${category.id}`}
              className="education-pathway"
            >
              <summary>
                <h3>{category.name}</h3>
                <span className="pathway-indicator" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="pathway-body">
                {pathway ? (
                  <>
                    <p className="pathway-introduction">
                      {pathway.introduction}
                    </p>
                    <div className="pathway-columns">
                      <div>
                        <h4>Training & certification options</h4>
                        {pathway.options.map((option) => (
                          <div className="education-option" key={option.href}>
                            <span className="option-kind">{option.kind}</span>
                            <a href={option.href} rel="external">
                              {option.name} <span aria-hidden="true">↗</span>
                            </a>
                            <p>{option.description}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4>General steps</h4>
                        <ol>
                          {pathway.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                        <dl className="pathway-facts">
                          <dt>Typical timeline</dt>
                          <dd>{pathway.timeline}</dd>
                          <dt>External education costs</dt>
                          <dd>{pathway.costs}</dd>
                        </dl>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>
                    Education options, steps, timelines, costs and provider
                    references: To be confirmed.
                  </p>
                )}
                <Link className="public-text-link" href="/list-your-business">
                  Apply to list your business <span aria-hidden="true">→</span>
                  <span className="sr-only"> — {category.name}</span>
                </Link>
              </div>
            </details>
          ))}
        </div>
      </section>
      <aside className="public-closing-band">
        <div>
          <h2>Bring your experience to the directory.</h2>
          <p>
            Describe your services and actual qualifications when you apply.
            Education fees are separate from directory membership.
          </p>
        </div>
        <ButtonLink href="/pricing">Explore membership pricing</ButtonLink>
      </aside>
    </div>
  );
}
