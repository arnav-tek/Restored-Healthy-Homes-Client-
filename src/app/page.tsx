import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { directoryRepository, locationAdapter } from "@/data";
import { HomeSearch } from "@/features/directory/home-search";
import {
  CategoryBrowse,
  HomeJourney,
  HomeFeatures,
  HomeAbout,
  HomeBusiness,
} from "@/features/home/home-sections";
import { HomeStatistics } from "@/features/home/home-statistics";
import { ReviewProcess } from "@/features/home/review-process";
import { FeaturedExamples } from "@/features/home/featured-examples";

export const metadata: Metadata = {
  title: "Find healthy-home professionals",
  description:
    "Explore eight healthy-home specialties, search by city or ZIP, and find a starting point for your next project.",
};
export default async function Home() {
  const [catalog, locations, listings, featured] = await Promise.all([
    directoryRepository.getCategories(),
    locationAdapter.listSupported(),
    directoryRepository
      .listPublic()
      .then((records) => records.map(({ id, state }) => ({ id, state })))
      .catch(() => null),
    directoryRepository.listFeaturedPublic().catch(() => []),
  ]);
  return (
    <>
      <section className="home-hero">
        <div className="container home-hero-inner">
          <div className="hero-copy">
            <p className="hero-kicker section-tag section-tag-inverse">Restored Healthy Homes</p>
            <h1>Find a professional for your healthier home.</h1>
            <p>
              From a moisture concern to a new build, find the specialty and
              services for your next step.
            </p>
          </div>
          <HomeSearch catalog={catalog} locations={locations} />
          <HomeStatistics listings={listings} />
          <div className="hero-followup">
            <Link href="/directory">
              Browse professionals <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <CategoryBrowse catalog={catalog} />
      <HomeJourney />
      <HomeFeatures />
      <FeaturedExamples professionals={featured} catalog={catalog} />
      <ReviewProcess />
      <HomeAbout />
      <HomeBusiness />
    </>
  );
}
