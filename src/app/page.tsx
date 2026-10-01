import Link from "next/link";
import { ArrowRight, Leaf, Sprout } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { directoryRepository, locationAdapter } from "@/data";
import { HomeSearch } from "@/features/directory/home-search";
export default async function Home() {
  const [catalog, locations] = await Promise.all([
    directoryRepository.getCategories(),
    locationAdapter.listSupported(),
  ]);
  return (
    <>
      <section className="home-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker">
              <Sprout size={18} aria-hidden="true" /> A healthier home starts
              here
            </p>
            <h1>
              Find the right people
              <br className="desktop-break" /> for your healthy home.
            </h1>
            <p>
              Connect with professionals who understand the spaces you live in.
              Explore specialties in mold, building, design and personal health.
            </p>
            <ButtonLink className="button-clay" href="/directory">
              Explore the directory <ArrowRight size={18} aria-hidden="true" />
            </ButtonLink>
            <p className="hero-demo">
              An early look · Fictional listings for this preview
            </p>
          </div>
          <HomeSearch catalog={catalog} locations={locations} />
        </div>
      </section>
      <section className="container home-intro">
        <div>
          <span className="section-label">
            <Leaf size={19} aria-hidden="true" /> Built around your home
          </span>
          <h2>A clearer place to begin.</h2>
        </div>
        <div>
          <p>
            Whether you’re investigating a concern or making plans for a new
            space, finding the right specialty is a useful first step.
          </p>
          <p>
            Browse the sample directory, explore the services each business
            offers, and see how Restored Healthy Homes is taking shape.
          </p>
          <Link className="text-link" href="/directory">
            Find your specialty <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
