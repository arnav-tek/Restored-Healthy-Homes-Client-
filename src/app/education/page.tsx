import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Shield,
  Home,
  HardHat,
  Wrench,
  DraftingCompass,
  Leaf,
  PawPrint,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Plus,
  Minus,
  Clock,
  Coins,
} from "lucide-react";
import { directoryRepository } from "@/data";
import { getEducationPathways } from "@/data/content/education";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Certifications",
  description:
    "Explore external education and certification pathways for healthy-home professionals, with provider references and guidance on choosing a specialty.",
};

function getCategoryIcon(id: string) {
  switch (id) {
    case "mold-inspection":
      return Search;
    case "mold-remediation":
      return Shield;
    case "healthy-renovations":
      return Home;
    case "healthy-builders":
      return HardHat;
    case "healthy-trades":
      return Wrench;
    case "healthy-designers":
      return DraftingCompass;
    case "health-practitioners":
      return Leaf;
    case "mold-detection-dogs":
      return PawPrint;
    default:
      return Search;
  }
}

export default async function EducationPage() {
  const pathways = getEducationPathways(
    await directoryRepository.getCategories(),
  );
  return (
    <div className="learning-page container">
      {/* Introduction above the category pathways. */}
      <header className="public-page-intro education-hero">
        <div className="education-hero-left">
          <p className="public-eyebrow section-tag">FOR SPECIALISTS</p>
          <h1>
            Grow your professional knowledge.
            <br />
            Choose your path.
          </h1>
          <div className="public-intro-copy education-intro-below">
            <p>
              Explore education and certification options for your specialty.
              Restored Healthy Homes connects professionals to external
              providers; we do not train or certify professionals.
            </p>
            <p>
              A course completion certificate, a professional certification and
              a license serve different purposes. Check requirements for your
              work and location.
            </p>
          </div>
        </div>
      </header>

      {/* Specialty Navigation: 4-column compact cards in a soft-sage panel */}
      <nav
        className="pathway-index specialty-nav-panel"
        aria-label="Education categories"
      >
        <div className="specialty-nav-grid">
          {pathways.map(({ category }) => {
            const CategoryIcon = getCategoryIcon(category.id);
            return (
              <a
                key={category.id}
                href={`#pathway-${category.id}`}
                className="specialty-nav-card"
              >
                <div className="specialty-nav-icon-wrap" aria-hidden="true">
                  <CategoryIcon size={18} />
                </div>
                <span className="specialty-nav-name">{category.name}</span>
                <ChevronRight
                  size={14}
                  className="specialty-nav-arrow"
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </div>
      </nav>

      {/* Explore your specialty section */}
      <section aria-labelledby="pathways-heading" className="pathways-section">
        <div className="public-section-heading">
          <h2 id="pathways-heading">Explore your specialty</h2>
          <p>
            Open a pathway for options and next steps. These references are
            starting points, not directory requirements or endorsements. Program
            selections, typical timelines and total costs are to be confirmed.
          </p>
        </div>

        {/* Accordion list */}
        <div className="pathway-list">
          {pathways.map(({ category, pathway }) => {
            const CategoryIcon = getCategoryIcon(category.id);
            return (
              <details
                key={category.id}
                id={`pathway-${category.id}`}
                className="education-pathway"
              >
                <summary className="pathway-summary">
                  <div className="summary-left">
                    <div className="summary-icon-box" aria-hidden="true">
                      <CategoryIcon size={20} className="summary-icon" />
                    </div>
                    <div className="summary-text-group">
                      <h3>{category.name}</h3>
                      {pathway && (
                        <p className="summary-intro">{pathway.introduction}</p>
                      )}
                    </div>
                  </div>
                  <span className="pathway-indicator" aria-hidden="true">
                    <Plus size={18} className="indicator-plus" />
                    <Minus size={18} className="indicator-minus" />
                  </span>
                </summary>
                <div className="pathway-body">
                  {pathway ? (
                    <div className="pathway-columns">
                      {/* Left: Training & certification options */}
                      <div className="pathway-card pathway-options-card">
                        <div className="options-card-top">
                          <h4 className="pathway-card-title">
                            Training & certification options
                          </h4>
                          {pathway.options.map((option) => (
                            <div className="education-option" key={option.href}>
                              <span className="option-kind">{option.kind}</span>
                              <div className="option-provider-box">
                                <a
                                  href={option.href}
                                  rel="external"
                                  target="_blank"
                                  className="option-link"
                                >
                                  <span>{option.name}</span>
                                  <ExternalLink
                                    size={14}
                                    className="external-icon"
                                    aria-hidden="true"
                                  />
                                </a>
                                <p className="option-desc">
                                  {option.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Link
                          className="apply-business-btn"
                          href="/list-your-business"
                        >
                          <span>Apply to list your business</span>
                          <ArrowRight size={14} aria-hidden="true" />
                          <span className="sr-only"> — {category.name}</span>
                        </Link>
                      </div>

                      {/* Right: Next steps and considerations */}
                      <div className="pathway-card pathway-steps-card">
                        <h4 className="pathway-card-title">
                          Next steps and considerations
                        </h4>
                        <ol className="pathway-steps-list">
                          {pathway.steps.map((step, idx) => (
                            <li key={step} className="pathway-step-item">
                              <span className="step-num" aria-hidden="true">
                                {idx + 1}
                              </span>
                              <span className="step-text">{step}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="pathway-meta-group">
                          <div className="pathway-meta-item">
                            <Clock
                              size={16}
                              className="meta-icon"
                              aria-hidden="true"
                            />
                            <div className="meta-content">
                              <p className="meta-label">Typical timeline</p>
                              <p className="meta-value">{pathway.timeline}</p>
                            </div>
                          </div>
                          <div className="pathway-meta-item">
                            <Coins
                              size={16}
                              className="meta-icon"
                              aria-hidden="true"
                            />
                            <div className="meta-content">
                              <p className="meta-label">
                                External education costs
                              </p>
                              <p className="meta-value">{pathway.costs}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p>
                      Education options, steps, timelines, costs and provider
                      references: To be confirmed.
                    </p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Join our directory CTA banner */}
      <aside className="public-closing-band education-closing-cta">
        <div className="closing-cta-content">
          <p className="closing-cta-eyebrow section-tag">JOIN OUR DIRECTORY</p>
          <h2>Bring your experience to the directory.</h2>
          <p>
            Describe your services and actual qualifications when you apply.
            Education fees are separate from directory membership.
          </p>
        </div>
        <ButtonLink href="/pricing" className="closing-cta-btn">
          <span>Explore membership pricing</span>
          <ArrowRight size={15} aria-hidden="true" />
        </ButtonLink>
      </aside>
    </div>
  );
}
