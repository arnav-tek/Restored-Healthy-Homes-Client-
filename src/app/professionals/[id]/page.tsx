import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { directoryRepository } from "@/data";
import { loadProfile } from "@/features/profiles/load-profile";
import { SessionProfile } from "@/features/profiles/session-profile";
import { isPublicApplicationId } from "@/domain/public-application";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    returnTo?: string | string[];
    reviewPage?: string | string[];
  }>;
}
export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const id = (await params).id;
  if (isPublicApplicationId(id))
    return {
      title: "Specialist profile",
      description: "A profile available only in the current demonstration tab.",
      robots: { index: false, follow: false },
    };
  const profile = await loadProfile(id);
  if (!profile) notFound();
  return {
    title: `${profile.businessName || "Professional"}`,
    description: "Explore services, specialties and professional information.",
    robots: { index: false, follow: false },
  };
}
export default async function ProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const [{ id }, query, catalog] = await Promise.all([
    params,
    searchParams,
    directoryRepository.getCategories(),
  ]);
  // The server cannot know tab memory. Only this reserved route receives a
  // neutral no-index shell; all other unknown/private IDs keep real 404s.
  if (isPublicApplicationId(id))
    return <SessionProfile id={id} catalog={catalog} returnTo={query.returnTo} reviewPage={query.reviewPage} />;
  const profile = await loadProfile(id);
  if (!profile) notFound();
  return (
    <SessionProfile
      id={id}
      catalog={catalog}
      returnTo={query.returnTo}
      reviewPage={query.reviewPage}
    />
  );
}
