import { ConnectedReviewsSection } from "@/features/reviews/connected-reviews-section";
import type { PublicReview } from "@/domain/review";
import { ProfileImage } from "./profile-image";
import { publicProfileImageHref } from "@/domain/profile-media";
import Link from "next/link";
import type { PublicProfile } from "@/domain/professional";
import type { Category } from "@/domain/categories";
import { ConnectedInquiryForm } from "./connected-inquiry-form";
export function ConnectedProfileView({
  profile,
  catalog,
  reviews,
  reviewPage,
}: {
  profile: PublicProfile;
  catalog: readonly Category[];
  reviews?: readonly PublicReview[];
  reviewPage?: unknown;
}) {
  const website = /^https?:\/\//i.test(profile.contact.website)
    ? profile.contact.website
    : null;
  return (
    <div className="container profile-page">
      <Link className="text-link profile-return" href="/directory">
        Back to professionals
      </Link>
      <header className="profile-heading">
        <div className="profile-heading-copy">
          <h1>{profile.businessName}</h1>
          {profile.publicDisplayName?.trim() && (
            <p>
              <strong>Professional / owner:</strong> {profile.publicDisplayName}
            </p>
          )}
          <p>
            {profile.city}, {profile.state}
          </p>
          <p>
            {profile.categoryIds
              .map((id) => catalog.find((c) => c.id === id)?.name)
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <ProfileImage
          src={
            profile.photoId
              ? publicProfileImageHref(profile.id, profile.photoId)
              : null
          }
          alt={`${profile.businessName} profile image`}
          className="profile-photo-placeholder"
          style={{ width: "100%", maxWidth: 320, height: 240 }}
        />
      </header>
      <div className="panel profile-details">
        <section>
          <h2>About this business</h2>
          <p>{profile.summary}</p>
        </section>
        <section>
          <h2>Services</h2>
          <ul>
            {profile.services.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {profile.serviceArea && <p>Service area: {profile.serviceArea}</p>}
        </section>
        <section>
          <h2>Credentials</h2>
          {profile.verifiedCredentials.map((c) => (
            <p key={c}>{c} · Reviewed credential</p>
          ))}
          {profile.listedCredentials.map((c) => (
            <p key={c}>{c} · Submitted claim, not reviewed</p>
          ))}
          {!profile.verifiedCredentials.length &&
            !profile.listedCredentials.length && <p>No credentials listed.</p>}
        </section>
        <section>
          <h2>Public contact details</h2>
          {profile.contact.email && <p>{profile.contact.email}</p>}
          {profile.contact.phone && <p>{profile.contact.phone}</p>}
          {website && (
            <a href={website} rel="noopener noreferrer">
              Visit website
            </a>
          )}
          {!profile.contact.email && !profile.contact.phone && !website && (
            <p>No public contact details provided.</p>
          )}
        </section>
        <ConnectedReviewsSection
          professionalId={profile.id}
          reviews={reviews}
          requestedPage={reviewPage}
        />
        <ConnectedInquiryForm professionalId={profile.id} />
      </div>
    </div>
  );
}
