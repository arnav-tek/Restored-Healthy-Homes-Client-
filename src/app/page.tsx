import { applicationMode } from "@/domain/config";
import { loadConnectedHome } from "@/data/supabase/public-home";
import {
  ConnectedHomeSearch,
  ConnectedHomeStatistics,
} from "@/features/home/connected-home";
import { CategoryBrowseView } from "@/features/home/category-browse-view";
import { FeaturedListingsView } from "@/features/home/featured-listings-view";
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
import { HeroVideo } from "@/features/home/hero-video";

export const metadata: Metadata = {
  title: "Find healthy-home specialists",
  description:
    "Explore healthy-home specialties, browse by state, and find a starting point for your next project.",
};
export default async function Home() {
  const connected = applicationMode(process.env) === "staging";
  const snapshot = connected ? await loadConnectedHome() : null;
  const [catalog, locations, listings, featured] = connected
    ? [snapshot!.catalog, [], snapshot!.profiles, snapshot!.featured]
    : await Promise.all([
        directoryRepository.getCategories(),
        locationAdapter.listSupported(),
        directoryRepository.listPublic().catch(() => null),
        directoryRepository.listFeaturedPublic().catch(() => []),
      ]);
  return (
    <>
      <section className="home-hero">
        <HeroVideo />
        <div className="container home-hero-inner">
          <div className="hero-copy">
            <p className="hero-kicker section-tag section-tag-inverse">
              Restored Healthy Homes
            </p>
            <h1>Find a specialist for your healthier home.</h1>
            <p>
              From a moisture concern to a new build and the health
              practitioners who help families heal, find the specialists you
              need in one place.
            </p>
          </div>
          {connected ? (
            <ConnectedHomeSearch
              catalog={catalog}
              unavailable={snapshot!.unavailable}
            />
          ) : (
            <HomeSearch catalog={catalog} locations={locations} />
          )}
          {connected ? (
            <ConnectedHomeStatistics
              reviews={snapshot!.reviews}
              listings={snapshot!.unavailable ? null : snapshot!.profiles}
            />
          ) : (
            <HomeStatistics
              listings={
                listings?.map(({ id, state }) => ({ id, state })) ?? null
              }
            />
          )}
          <div className="hero-followup">
            <Link href="/directory">
              Browse specialists <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <div className="homepage-sections">
        <HomeJourney />
        {connected ? (
          <CategoryBrowseView catalog={catalog} />
        ) : (
          <CategoryBrowse catalog={catalog} />
        )}
        <HomeAbout />
        <HomeFeatures />
        {connected ? (
          <FeaturedListingsView
            connected
            unavailable={snapshot!.unavailable}
            professionals={featured}
            catalog={catalog}
          />
        ) : (
          <FeaturedExamples
            professionals={listings ?? []}
            initialFeaturedIds={featured.map(({ id }) => id)}
            catalog={catalog}
          />
        )}
        <ReviewProcess />
        <HomeBusiness />
      </div>
    </>
  );
}
