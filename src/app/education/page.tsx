import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { directoryRepository } from "@/data";
import { getEducationPathways } from "@/data/content/education";
import { ButtonLink } from "@/components/ui/button";

import { EducationPathways } from "@/features/education/education-pathways";

export const metadata: Metadata = {
  title: "Certifications",
  description:
    "Explore external education and certification pathways for healthy-home professionals, with provider references and guidance on choosing a specialty.",
};

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

      <EducationPathways
        pathways={pathways.map(({ category, pathway }) => ({
          category: { id: category.id, name: category.name },
          pathway,
        }))}
      />

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
