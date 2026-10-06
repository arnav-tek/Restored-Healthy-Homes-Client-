import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Shield,
  Hammer,
  House,
  Wrench,
  Ruler,
  HeartPulse,
  Dog,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { Category } from "@/domain/categories";
import { consultationOfferLabel } from "@/domain/consultation";

// Presentation only; names and descriptions continue to come from the catalog.
const categoryIcons: Readonly<Record<string, LucideIcon>> = {
  "mold-inspection": Search,
  "mold-remediation": Shield,
  "healthy-renovations": Hammer,
  "healthy-builders": House,
  "healthy-trades": Wrench,
  "healthy-designers": Ruler,
  "health-practitioners": HeartPulse,
  "mold-detection-dogs": Dog,
};

export function CategoryBrowse({ catalog }: { catalog: readonly Category[] }) {
  return (
    <section
      className="container home-section"
      aria-labelledby="category-heading"
    >
      <div className="home-section-heading">
        <h2 id="category-heading">Find the specialty you need.</h2>
        <p>
          From a moisture concern to a new build, start with the work you have
          in mind.
        </p>
      </div>
      <ul className="home-categories" aria-label="Browse specialties">
        {catalog.map((category) => {
          const Icon = categoryIcons[category.id] ?? House;
          return (
            <li key={category.id}>
              <Link
                href={`/directory?category=${encodeURIComponent(category.id)}`}
              >
                <Icon className="category-icon" size={24} aria-hidden="true" />
                <div className="category-copy">
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
                <ArrowUpRight
                  className="category-arrow"
                  size={18}
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HomeJourney() {
  return (
    <section
      className="container home-section"
      aria-labelledby="journey-heading"
    >
      <div className="home-section-heading">
        <h2 id="journey-heading">A clearer path to your next step.</h2>
        <p>Find, explore, then start a conversation.</p>
      </div>
      <ol className="home-steps">
        <li>
          <h3>Find a specialty</h3>
          <p>
            Choose a category and a place to explore relevant professionals.
          </p>
        </li>
        <li>
          <h3>Explore a profile</h3>
          <p>Get to know the business, its services and listed credentials.</p>
        </li>
        <li>
          <h3>Start an inquiry</h3>
          <p>
            Prepare your questions and try an inquiry. Demo inquiries are not
            delivered.
          </p>
        </li>
      </ol>
    </section>
  );
}

export function HomeFeatures() {
  return (
    <section className="home-features-band" aria-labelledby="features-heading">
      <div className="container home-section">
        <p className="section-label">Questions & conversations</p>
        <h2 id="features-heading">Explore an idea. Discuss a project.</h2>
        <div className="home-features">
          <article className="home-question-spotlight">
            <p className="feature-label">Ask a Specialist</p>
            <h3>A useful question is a good beginning.</h3>
            <p>
              Browse questions and specialist answers about homes, materials and
              indoor environments. Find a starting point for your own questions.
            </p>
            <Link className="text-link" href="/questions">
              Ask a Specialist <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <p className="feature-note">
              Sample questions and answers for this preview.
            </p>
          </article>
          <article className="home-consultation-spotlight">
            <p className="feature-label">Consultations</p>
            <h3>Have a specific project in mind?</h3>
            <p>
              Explore a focused conversation about your plans and try the
              consultation request.
            </p>
            <Link className="text-link" href="/consultations">
              Explore consultations <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <p className="feature-note">
              Proposed {consultationOfferLabel()}, pending client confirmation.
              Demo requests do not book appointments or collect payment.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function HomeAbout() {
  return (
    <section
      className="container home-section home-about"
      aria-labelledby="home-about-heading"
    >
      <div>
        <p className="section-label">About Restored Healthy Homes</p>
        <h2 id="home-about-heading">
          Different specialties.
          <br />
          One place to begin.
        </h2>
      </div>
      <div>
        <p>
          A healthier-home project can involve more than one kind of
          professional. Bringing these specialties together makes it easier to
          explore who does what, understand the options and plan a conversation.
        </p>
        <Link className="text-link" href="/about">
          About Us <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className="field-help">
          Purpose preview · Final story awaiting approval.
        </p>
      </div>
    </section>
  );
}

export function HomeBusiness() {
  return (
    <section className="home-business" aria-labelledby="business-heading">
      <div className="container home-business-inner">
        <div>
          <p className="section-label">For professionals</p>
          <h2 id="business-heading">Bring your specialty to the directory.</h2>
          <p>Apply to list your business and introduce the work you do.</p>
          <p className="business-note">
            Try the demo application with fictional details.
          </p>
        </div>
        <ButtonLink href="/list-your-business">
          List Your Business <ArrowRight size={18} aria-hidden="true" />
        </ButtonLink>
      </div>
    </section>
  );
}
