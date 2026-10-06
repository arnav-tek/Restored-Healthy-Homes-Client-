import type { Metadata } from "next";
import { ArrowRight, Sprout } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { directoryRepository, locationAdapter } from "@/data";
import { HomeSearch } from "@/features/directory/home-search";
import {
  CategoryBrowse,
  HomeJourney,
  HomeFeatures,
  HomeAbout,
} from "@/features/home/home-sections";
import { HomeStatistics } from "@/features/home/home-statistics";

export const metadata: Metadata = {
  title: "Find healthy-home professionals | Demo preview",
  description:
    "Explore eight healthy-home specialties, search by city or ZIP, and try the Restored Healthy Homes directory with fictional demo data.",
};
export default async function Home() {
  const [catalog, locations, listings] = await Promise.all([
    directoryRepository.getCategories(),
    locationAdapter.listSupported(),
    directoryRepository
      .listPublic()
      .then((records) => records.map(({ id, state }) => ({ id, state })))
      .catch(() => null),
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
              Explore professionals in mold testing, building, design and
              personal health. Find a specialty, understand the services, and
              plan your next conversation.
            </p>
            <div className="public-page-actions">
              <ButtonLink href="/directory">
                Explore the directory{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink className="hero-secondary" href="/list-your-business">
                List Your Business
              </ButtonLink>
            </div>
            <p className="hero-demo">
              Demo preview · Fictional listings and local forms. Nothing is
              delivered.
            </p>
          </div>
          <HomeSearch catalog={catalog} locations={locations} />
        </div>
      </section>
      <CategoryBrowse catalog={catalog} />
      <HomeStatistics listings={listings} />
      <HomeJourney />
      <HomeFeatures />
      <HomeAbout />
    </>
  );
}
