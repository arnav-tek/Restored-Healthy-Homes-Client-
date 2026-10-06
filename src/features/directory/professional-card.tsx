import { ChevronDown, MapPin, FileCheck2, Sprout } from "lucide-react";
import type { PublicProfessional } from "@/domain/professional";
import type { Category } from "@/domain/categories";
import Link from "next/link";
import { profileHref } from "@/validation/profile";
export function ProfessionalCard({
  professional,
  catalog,
  distanceMiles,
  returnTo,
}: {
  professional: PublicProfessional;
  catalog: readonly Category[];
  distanceMiles?: number;
  returnTo?: string;
}) {
  const initials = professional.businessName
    .split(" ")
    .filter((word) => /^[a-z]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (
    <article className="professional-card" data-testid="professional-card">
      <div className="card-top">
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
      </div>
      <div className="card-body">
        <p className="category-label">
          {professional.categoryIds
            .map((id) => catalog.find((category) => category.id === id)?.name)
            .join(" · ")}
        </p>
        <h3>{professional.businessName}</h3>
        <p className="location">
          <MapPin size={15} aria-hidden="true" />
          {professional.city}, {professional.state}
        </p>
        {distanceMiles !== undefined ? (
          <p className="distance">
            Approx. {Math.round(distanceMiles)} miles from search city
          </p>
        ) : null}
        <p className="specialty">{professional.specialty}</p>
        <p className="card-summary">{professional.summary}</p>
        <div className="credential-line">
          {professional.verifiedCredentials.length > 0 ? (
            <>
              <FileCheck2 size={16} aria-hidden="true" />
              Credentials listed
            </>
          ) : (
            <>
              <Sprout size={16} aria-hidden="true" />
              Business information
            </>
          )}
        </div>
        <details className="services">
          <summary>
            Explore services
            <span className="sr-only"> at {professional.businessName}</span>
            <ChevronDown size={17} aria-hidden="true" />
          </summary>
          <ul>
            {professional.services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
          <p>
            Explore the profile for service details and an inquiry form.
          </p>
        </details>
        <Link
          className="text-link profile-card-link"
          href={profileHref(professional.id, returnTo)}
        >
          View profile
          <span className="sr-only"> for {professional.businessName}</span>
        </Link>
      </div>
    </article>
  );
}
