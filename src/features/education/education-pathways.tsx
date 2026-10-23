"use client";
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
import type { EducationPathway } from "@/data/content/education";
import {
  useDemoSession,
  useSessionCategories,
} from "@/features/member/demo-session";
import { projectCertification } from "@/domain/editorial";
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

export function EducationPathways({
  pathways: seed,
}: {
  pathways: readonly {
    category: { id: string; name: string };
    pathway: EducationPathway | undefined;
  }[];
}) {
  const { state } = useDemoSession();
  const catalog = useSessionCategories();
  const pathways = catalog.map((category) => {
    const entry = state.certifications.find(
      (item) => item.categoryId === category.id,
    );
    const published = entry ? projectCertification(entry) : null;
    const pathway: EducationPathway | undefined = published
      ? {
          introduction: published.introduction,
          options: [
            {
              name: published.providerName,
              kind: published.kind,
              description: published.description,
              href: published.providerUrl as `https://${string}`,
            },
          ],
          requirements: published.requirements,
          steps: published.steps,
          timeline: published.timeline,
          costs: published.costs,
        }
      : seed.find((item) => item.category.id === category.id)?.pathway;
    return { category, pathway };
  });
  return (
    <>
      {" "}
      {/* Specialty Navigation: 4-column compact cards in a soft-sage panel */}
      <nav
        className="pathway-index specialty-nav-panel"
        aria-label="Education categories"
      >
        <div className="specialty-nav-grid" data-scroll-stagger>
          {pathways.map(({ category }) => {
            const CategoryIcon = getCategoryIcon(category.id);
            return (
              <a
                key={category.id}
                href={`#pathway-${category.id}`}
                className="specialty-nav-card"
                data-scroll-reveal
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
        <div className="public-section-heading" data-scroll-reveal>
          <h2 id="pathways-heading">Explore your specialty</h2>
          <p>
            Open a pathway for options and next steps. These references are
            starting points, not directory requirements or endorsements. Program
            selections, typical timelines and total costs are to be confirmed.
          </p>
        </div>

        {/* Accordion list */}
        <div className="pathway-list" data-scroll-stagger>
          {pathways.map(({ category, pathway }) => {
            const CategoryIcon = getCategoryIcon(category.id);
            return (
              <details
                key={category.id}
                id={`pathway-${category.id}`}
                className="education-pathway"
                data-scroll-reveal
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
                        {pathway.requirements && (
                          <div className="pathway-entry-requirements">
                            <h5>Entry requirements</h5>
                            <p>{pathway.requirements}</p>
                          </div>
                        )}
                        <ol className="pathway-steps-list">
                          {pathway.steps.map((step, idx) => (
                            <li key={`${category.id}-step-${idx}`} className="pathway-step-item">
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
    </>
  );
}
