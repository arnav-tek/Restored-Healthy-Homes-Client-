import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { directoryRepository } from "@/data";
import { loadProfile } from "@/features/profiles/load-profile";
import { ProfileView } from "@/features/profiles/profile-view";
import { safeDirectoryReturn } from "@/validation/profile";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}
export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const profile = await loadProfile((await params).id);
  if (!profile) notFound();
  return {
    title: `${profile.businessName || "Sample professional"} | Demo profile`,
    description:
      "Fictional professional profile. Demo inquiries are not sent or saved.",
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
  const profile = await loadProfile(id);
  if (!profile) notFound();
  return (
    <ProfileView
      profile={profile}
      catalog={catalog}
      returnTo={safeDirectoryReturn(query.returnTo, catalog)}
    />
  );
}
