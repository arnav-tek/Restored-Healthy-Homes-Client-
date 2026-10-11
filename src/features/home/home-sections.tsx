import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Search,
  Shield,
  Hammer,
  House,
  Wrench,
  Ruler,
  HeartPulse,
  Dog,
  MessageSquare,
  Calendar,
  Users,
  FileText,
  Sprout,
  Send,
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

const highlightedCategories = new Set([
  "mold-remediation",
  "health-practitioners",
]);

export function CategoryBrowse({ catalog }: { catalog: readonly Category[] }) {
  return (
    <section
      className="container home-section category-browse-section"
      aria-labelledby="category-heading"
    >
      <div className="home-section-heading category-browse-header">
        <div className="category-header-main">
          <div className="category-pill-row">
            <span className="category-pill">SPECIALTY</span>
            <span className="category-pill-divider" aria-hidden="true" />
          </div>
          <h2 id="category-heading">
            Find the specialty you <br className="category-heading-break" />
            need.
          </h2>
        </div>
        <p className="category-header-sub">
          From a moisture concern to a new build, start with the work you have
          in mind.
        </p>
      </div>
      <ul className="home-categories" aria-label="Browse specialties">
        {catalog.map((category) => {
          const Icon = categoryIcons[category.id] ?? House;
          const isHighlighted = highlightedCategories.has(category.id);
          return (
            <li key={category.id}>
              <Link
                href={`/directory?category=${encodeURIComponent(category.id)}`}
                className={`category-card ${isHighlighted ? "category-card-accent" : ""}`}
              >
                <div className="category-card-header">
                  <div className="category-icon-circle" aria-hidden="true">
                    <Icon size={22} className="category-icon" />
                  </div>
                  <div className="category-arrow-circle" aria-hidden="true">
                    <ArrowRight size={15} />
                  </div>
                </div>
                <div className="category-copy">
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
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
      className="container home-section home-journey"
      aria-labelledby="journey-heading"
    >
      <div className="home-journey-intro">
        <div className="home-journey-eyebrow">
          <span>How it works</span>
          <span className="journey-eyebrow-line" aria-hidden="true" />
        </div>
        <h2 id="journey-heading">
          A clearer path
          <br />
          to your next step.
        </h2>
        <p className="home-journey-desc">
          Find, explore, then start a conversation.
        </p>
        <ButtonLink className="home-journey-link button" href="/directory">
          Find professionals <ArrowRight size={16} aria-hidden="true" />
        </ButtonLink>
      </div>

      <ol className="home-steps" aria-label="How it works steps">
        <li className="home-step-card">
          <div className="step-num-badge" aria-hidden="true">
            <span>01</span>
          </div>
          <div className="step-divider" aria-hidden="true" />
          <div className="step-content">
            <h3>Find a specialty</h3>
            <p>
              Choose a category and a place to explore relevant professionals.
            </p>
          </div>
          <div className="step-icon-badge" aria-hidden="true">
            <Search size={18} strokeWidth={1.8} />
          </div>
          <div className="step-connector-node" aria-hidden="true" />
        </li>

        <li className="home-step-card">
          <div className="step-num-badge" aria-hidden="true">
            <span>02</span>
          </div>
          <div className="step-divider" aria-hidden="true" />
          <div className="step-content">
            <h3>Explore a profile</h3>
            <p>
              Get to know the business, its services and listed credentials.
            </p>
          </div>
          <div className="step-icon-badge" aria-hidden="true">
            <FileText size={18} strokeWidth={1.8} />
          </div>
          <div className="step-connector-node" aria-hidden="true" />
        </li>

        <li className="home-step-card">
          <div className="step-num-badge" aria-hidden="true">
            <span>03</span>
          </div>
          <div className="step-divider" aria-hidden="true" />
          <div className="step-content">
            <h3>Start an inquiry</h3>
            <p>
              Prepare your questions and outline what you would like to discuss.
            </p>
          </div>
          <div className="step-icon-badge" aria-hidden="true">
            <Send size={18} strokeWidth={1.8} />
          </div>
        </li>
      </ol>
    </section>
  );
}

export function HomeFeatures() {
  return (
    <section className="home-features-band" aria-labelledby="features-heading">
      <div className="container home-section">
        <div className="home-features-header">
          <div className="section-kicker">
            <span className="section-kicker-line" aria-hidden="true" />
            <p className="section-label">Ways to get started</p>
          </div>
          <h2 id="features-heading">Explore Restored Healthy Homes</h2>
          <p className="features-intro">
            Our professional directory brings healthy-home specialties together.{" "}
            <Link className="underline underline-offset-4" href="/directory">
              Find professionals
            </Link>{" "}
            or{" "}
            <Link className="underline underline-offset-4" href="/resources">
              explore resources
            </Link>{" "}
            as you plan your next step.
          </p>
        </div>
        <div className="home-features-grid home-features">
          <article className="home-feature-card home-specialist-card home-question-spotlight">
            <div className="feature-card-content">
              <div>
                <div className="feature-card-header">
                  <span
                    className="feature-icon-badge specialist-badge"
                    aria-hidden="true"
                  >
                    <MessageSquare size={17} />
                  </span>
                  <p className="feature-category-label">Ask a Specialist</p>
                </div>
                <div className="feature-card-body">
                  <h3>A useful question is a good beginning.</h3>
                  <p>
                    Browse questions and specialist answers about homes,
                    materials and indoor environments. Find a starting point for
                    your own questions.
                  </p>
                </div>
              </div>
              <div className="feature-card-action">
                <Link
                  className="feature-cta-btn specialist-btn text-link"
                  href="/questions"
                >
                  Ask a Specialist <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="feature-card-media" aria-hidden="true">
              <svg
                className="home-botanical-accent"
                viewBox="0 0 120 180"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 15 175 C 30 140, 50 95, 65 15"
                  stroke="#8ea889"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 65 15 C 68 8, 75 3, 80 5 C 83 15, 75 22, 65 24"
                  stroke="#8ea889"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 52 55 C 30 42, 10 50, 8 62 C 16 72, 36 68, 50 63"
                  stroke="#8ea889"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 57 75 C 80 62, 98 70, 102 82 C 94 92, 75 88, 55 83"
                  stroke="#8ea889"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 40 110 C 20 100, 5 110, 3 122 C 12 130, 30 125, 38 118"
                  stroke="#8ea889"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 33 135 C 55 125, 72 135, 75 145 C 68 153, 50 148, 30 142"
                  stroke="#8ea889"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="feature-image-wrapper arch-crop">
                <Image
                  src="/images/explore-specialist.webp"
                  alt=""
                  width={360}
                  height={480}
                  className="feature-card-image"
                />
              </div>
            </div>
          </article>

          <article className="home-feature-card home-consultation-card home-consultation-spotlight">
            <div className="feature-card-content">
              <div>
                <div className="feature-card-header">
                  <span
                    className="feature-icon-badge consultation-badge"
                    aria-hidden="true"
                  >
                    <Calendar size={17} />
                  </span>
                  <p className="feature-category-label">Consultations</p>
                </div>
                <div className="feature-card-body">
                  <h3>Have a specific project in mind?</h3>
                  <p>
                    <strong>{consultationOfferLabel()}</strong>
                  </p>
                  <p>
                    Explore a focused conversation about your plans and try the
                    consultation request.
                  </p>
                </div>
              </div>
              <div className="feature-card-action">
                <Link
                  className="feature-cta-btn consultation-btn text-link"
                  href="/consultations"
                >
                  Explore consultations{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="feature-card-media" aria-hidden="true">
              <div className="feature-image-wrapper arch-crop">
                <Image
                  src="/images/explore-consultation.webp"
                  alt=""
                  width={360}
                  height={480}
                  className="feature-card-image"
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function HomeAbout() {
  return (
    <section
      className="container home-about-section home-about"
      aria-labelledby="home-about-heading"
    >
      <div className="home-about-grid">
        <div className="home-about-intro">
          <div className="home-eyebrow">
            <span className="eyebrow-dash" aria-hidden="true" />
            <span className="eyebrow-text">About Us</span>
          </div>
          <h2 id="home-about-heading" className="home-about-title">
            Different specialties.
            <br />
            One place to begin.
          </h2>
          <p className="home-about-paragraph">
            A healthier-home project can involve more than one kind of
            professional. Bringing these specialties together makes it easier to
            explore who does what, understand the options and plan a
            conversation.
          </p>
          <Link className="home-about-cta-link text-link" href="/about">
            About Us <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="home-about-features">
          <div className="home-about-feature-col">
            <div className="home-feature-icon-wrap" aria-hidden="true">
              <Search size={20} />
            </div>
            <h3 className="home-feature-title">Explore</h3>
            <p className="home-feature-desc">
              Discover a range of healthy-home specialties.
            </p>
          </div>

          <div className="home-about-feature-col">
            <div className="home-feature-icon-wrap" aria-hidden="true">
              <FileText size={20} />
            </div>
            <h3 className="home-feature-title">Learn</h3>
            <p className="home-feature-desc">
              Find helpful information and real homeowner questions.
            </p>
          </div>

          <div className="home-about-feature-col">
            <div className="home-feature-icon-wrap" aria-hidden="true">
              <Users size={20} />
            </div>
            <h3 className="home-feature-title">Compare</h3>
            <p className="home-feature-desc">
              Understand your options and prepare for a conversation.
            </p>
          </div>

          <div className="home-about-feature-col">
            <div className="home-feature-icon-wrap" aria-hidden="true">
              <House size={20} />
            </div>
            <h3 className="home-feature-title">Healthier homes</h3>
            <p className="home-feature-desc">
              Take informed steps toward healthier indoor environments.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeBusiness() {
  return (
    <section
      className="home-business home-business-section"
      aria-labelledby="business-heading"
    >
      <div className="container">
        <div className="home-business-card">
          <div className="home-business-cta">
            <p className="home-business-eyebrow">
              <span className="eyebrow-dash" aria-hidden="true" />
              For professionals
            </p>
            <h2 id="business-heading">
              Bring your
              <br />
              specialty to
              <br />
              the directory.
            </h2>
            <p className="home-business-desc">
              Apply to list your business and introduce the work you do.
            </p>
            <ButtonLink
              href="/list-your-business"
              className="business-cta-button"
            >
              List Your Business <ArrowRight size={16} aria-hidden="true" />
            </ButtonLink>
          </div>

          <div className="home-business-benefits-wrap">
            <div className="home-business-benefits">
              <div className="benefit-col">
                <div className="benefit-icon-badge" aria-hidden="true">
                  <Users size={20} strokeWidth={1.8} />
                </div>
                <h3>Reach homeowners</h3>
                <p>
                  Connect with people actively looking for healthy-home
                  professionals.
                </p>
              </div>

              <div className="benefit-col">
                <div className="benefit-icon-badge" aria-hidden="true">
                  <FileText size={20} strokeWidth={1.8} />
                </div>
                <h3>Showcase your work</h3>
                <p>
                  Share your services, approach and credentials in one place.
                </p>
              </div>

              <div className="benefit-col">
                <div className="benefit-icon-badge" aria-hidden="true">
                  <Sprout size={20} strokeWidth={1.8} />
                </div>
                <h3>Explore a specialty</h3>
                <p>
                  Considering a new direction?{" "}
                  <Link className="text-link" href="/education">
                    Explore education pathways
                  </Link>{" "}
                  for professionals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
