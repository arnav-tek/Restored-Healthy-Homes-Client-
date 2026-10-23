import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { directoryRepository } from "@/data";
import { loadProfile } from "@/features/profiles/load-profile";
import { ProfileView } from "@/features/profiles/profile-view";
import { safeDirectoryReturn } from "@/validation/profile";
import { isPublicApplicationId } from "@/domain/public-application";
import { ApplicationProfile } from "@/features/profiles/application-profile";

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
    return <ApplicationProfile catalog={catalog} returnTo={query.returnTo} />;
  const profile = await loadProfile(id);
  if (!profile) notFound();
  return (
    <ProfileView
      profile={profile}
      catalog={catalog}
      returnTo={safeDirectoryReturn(query.returnTo, catalog)}
      reviewPage={query.reviewPage}
    />
  );
}
