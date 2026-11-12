import Link from "next/link";
import type { PublicProfile } from "@/domain/professional";
import type { Category } from "@/domain/categories";
import { ConnectedInquiryForm } from "./connected-inquiry-form";
export function ConnectedProfileView({
  profile,
  catalog,
}: {
  profile: PublicProfile;
  catalog: readonly Category[];
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
        <div className="profile-photo-empty">No photo yet</div>
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
          <p className="field-help">
            Reviews are not connected yet.
          </p>
        </section>
        <ConnectedInquiryForm professionalId={profile.id} />
      </div>
    </div>
  );
}
