import type { DemoPublicPreview } from "@/domain/demo-member";
import type { ApplicationCategory } from "./profile-fields-form";

export function PublicPreviewContent({
  profile,
  catalog,
}: {
  profile: DemoPublicPreview;
  catalog: readonly ApplicationCategory[];
}) {
  return (
    <>
      <h3 data-testid="member-preview-name">{profile.businessName}</h3>
      {profile.publicDisplayName && (
        <p>Professional / owner: {profile.publicDisplayName}</p>
      )}
      <p className="category-label">
        {catalog
          .filter((category) => profile.categoryIds.includes(category.id))
          .map((category) => category.name)
          .join(" · ")}
      </p>
      <p>
        {profile.city}, {profile.state}
      </p>
      <p>{profile.description}</p>
      <h3>Healthy-home practices</h3>
      <p>{profile.practices}</p>
      <h3>Services</h3>
      <ul>
        {profile.services.map((service, index) => (
          <li key={`${index}-${service}`}>{service}</li>
        ))}
      </ul>
      <h3>Listed credentials</h3>
      {profile.credentials.length ? (
        <ul>
          {profile.credentials.map((claim) => (
            <li key={claim.id}>
              {claim.text} —{" "}
              {claim.verification === "verified" ? (
                <span className="credential-badge">reviewed</span>
              ) : (
                "submitted claim, unverified"
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No listed credentials provided.</p>
      )}
      <p>
        Restored Healthy Homes does not issue certifications. Verification here
        is a review decision only.
      </p>
      <h3>Optional public contact details</h3>
      {profile.phone || profile.website || profile.publicEmail ? (
        <p>
          {profile.publicEmail && (
            <>
              {profile.publicEmail}
              <br />
            </>
          )}
          {profile.phone}
          <br />
          {profile.website}
        </p>
      ) : (
        <p>No phone or website provided.</p>
      )}
    </>
  );
}
