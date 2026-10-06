import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/domain/categories";
import { consultationOfferLabel } from "@/domain/consultation";

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
        {catalog.map((category) => (
          <li key={category.id}>
            <Link
              href={`/directory?category=${encodeURIComponent(category.id)}`}
            >
              <div>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </li>
        ))}
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
        <h2 id="journey-heading">From a question to a conversation.</h2>
        <p>Three steps to explore the directory.</p>
      </div>
      <ol className="home-steps">
        <li>
          <h3>Find a specialty</h3>
          <p>
            Search by category and city or ZIP to find professionals relevant to
            your plans.
          </p>
        </li>
        <li>
          <h3>Get to know the business</h3>
          <p>
            Explore profiles, services and listed credentials. The platform does
            not issue certifications.
          </p>
        </li>
        <li>
          <h3>Start an inquiry</h3>
          <p>
            Try the profile inquiry form with sample information. In this demo,
            nothing is sent or saved.
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
        <h2 id="features-heading">Choose your next step.</h2>
        <div className="home-features">
          <article>
            <h3>Learn from a question</h3>
            <p>
              Explore fictional questions and specialist answers about homes,
              materials and indoor environments.
            </p>
            <Link className="text-link" href="/questions">
              Ask a Specialist
            </Link>
          </article>
          <article>
            <h3>Have a project question in mind?</h3>
            <p>
              Explore the proposed {consultationOfferLabel()} offer, pending
              client confirmation. Try a demo request; no appointment is booked
              or payment taken.
            </p>
            <Link className="text-link" href="/consultations">
              Explore consultations
            </Link>
          </article>
          <article>
            <h3>Bring your work to the directory</h3>
            <p>
              See how a business application works. Use fictional details to
              preview the application and member experience.
            </p>
            <Link className="text-link" href="/list-your-business">
              List Your Business
            </Link>
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
        <h2 id="home-about-heading">A clearer place to begin.</h2>
      </div>
      <div>
        <p>
          The directory brings healthy-home specialties into one place, helping
          visitors explore who does what and where to start.
        </p>
        <p className="field-help">
          An introduction for this preview. Our client’s company story and video
          will follow.
        </p>
        <Link className="text-link" href="/about">
          About Us
        </Link>
      </div>
    </section>
  );
}
