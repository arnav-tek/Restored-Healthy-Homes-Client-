import Link from "next/link";
import type { PublicProfile } from "@/domain/professional";
import type { Category } from "@/domain/categories";
import { InquiryForm } from "./inquiry-form";
import { ReviewsSection } from "@/features/reviews/reviews-section";

export function ProfileView({
  profile,
  catalog,
  returnTo,
  reviewPage,
}: {
  profile: PublicProfile;
  catalog: readonly Category[];
  returnTo: string;
  reviewPage: unknown;
}) {
  const categoryNames = profile.categoryIds.flatMap((id) => {
    const category = catalog.find((item) => item.id === id);
    return category ? [category.name] : [];
  });
  const contact = Object.entries(profile.contact).filter(([, value]) =>
    value.trim(),
  );
  return (
    <div className="container profile-page">
      <Link className="text-link profile-return" href={returnTo}>
        {returnTo === "/directory" ? "Back to directory" : "Back to results"}
      </Link>
      <header className="profile-heading">
        <p className="section-label">Professional profile</p>
        <h1>{profile.businessName || "Professional"}</h1>
        <p className="category-label">
          {categoryNames.join(" · ") || "Category not provided"}
        </p>
        <p>
          {[profile.city, profile.state].filter(Boolean).join(", ") ||
            "Location not provided"}
        </p>
      </header>
      <div className="profile-layout">
        <div className="profile-details">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading">About this business</h2>
            {profile.specialty ? (
              <p className="specialty">{profile.specialty}</p>
            ) : null}
            <p>
              {profile.summary ||
                "A business description has not been provided for this profile."}
            </p>
          </section>
          <section aria-labelledby="service-area-heading">
            <h2 id="service-area-heading">Location &amp; service area</h2>
            <p>
              {profile.serviceArea ||
                "Service area not provided. A listed city does not establish service coverage."}
            </p>
          </section>
          <section aria-labelledby="services-heading">
            <h2 id="services-heading">Services</h2>
            {profile.services.length ? (
              <ul>
                {profile.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            ) : (
              <p>Service details have not been provided for this profile.</p>
            )}
          </section>
          <section aria-labelledby="credentials-heading">
            <h2 id="credentials-heading">Credentials</h2>
            <p>
              Restored Healthy Homes does not issue certifications. Confirm
              credentials directly with the issuing organization.
            </p>
            {profile.verifiedCredentials.length ? (
              <div className="profile-credentials">
                <h3>Credentials on file</h3>
                <ul>
                  {profile.verifiedCredentials.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No verified credentials are shown.</p>
            )}
            {profile.listedCredentials.length ? (
              <div className="profile-credentials">
                <h3>Listed credentials (unverified)</h3>
                <ul>
                  {profile.listedCredentials.map((name) => (
                    <li key={name}>{name} — not verified</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No additional listed credentials provided.</p>
            )}
          </section>
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading">Public contact information</h2>
            {contact.length ? (
              <>
                <p>
                  Contact details are for display only; direct contact is not
                  available here.
                </p>
                <dl className="profile-contact">
                  {contact.map(([label, value]) => (
                    <div key={label}>
                      <dt>
                        {label === "email"
                          ? "Email"
                          : label === "phone"
                            ? "Phone"
                            : "Website"}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p>
                No public contact details have been provided for this profile.
                You can still try the inquiry form.
              </p>
            )}
          </section>
        </div>
        <InquiryForm />
      </div>
      <ReviewsSection
        professionalId={profile.id}
        requestedPage={reviewPage}
        returnTo={returnTo}
      />
    </div>
  );
}
