"use client";
import { ProfileImage } from "@/features/profiles/profile-image";
import { publicProfileImageHref } from "@/domain/profile-media";
import Link from "next/link";
import { ArrowRight, ChevronDown, MapPin, Star } from "lucide-react";
import type { PublicProfessional } from "@/domain/professional";
import type { Category } from "@/domain/categories";
import { profileHref } from "@/validation/profile";

export function FeaturedListingsView({
  professionals,
  catalog,
  connected = false,
  unavailable = false,
}: {
  professionals: readonly PublicProfessional[];
  catalog: readonly Category[];
  connected?: boolean;
  unavailable?: boolean;
}) {
  return (
    <section
      className="container featured-examples-section"
      aria-labelledby="featured-heading"
    >
      <div className="featured-header" data-scroll-reveal>
        <div className="featured-header-left">
          <div className="home-eyebrow">
            <h2 id="featured-heading" className="eyebrow-text section-tag">
              {connected
                ? "Featured professionals"
                : "Featured listing examples"}
            </h2>
          </div>
          <p className="featured-heading-title">
            Explore specialists.
            <br />
            Preview the possibilities.
          </p>
        </div>
        <div className="featured-header-right">
          <p className="featured-disclaimer">
            {connected ? (
              "Featured placement is separate from credential review. Only eligible public listings appear here. Editorial selections are labelled separately."
            ) : (
              <>
                These are fictional examples showing how featured listings
                appear. Featured status is separate from credential review and
                requires an eligible public listing. Admin changes appear in
                this tab; final ranking and upgrade terms await approval.
              </>
            )}
          </p>
          <Link href="/directory" className="featured-directory-btn">
            Explore the directory <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {professionals.length > 0 ? (
        <div className="featured-grid" data-scroll-stagger>
          {professionals.map((professional) => {
            const initials = professional.businessName
              .split(" ")
              .filter((word) => /^[a-z]/i.test(word))
              .slice(0, 2)
              .map((word) => word[0])
              .join("");

            const categoryName =
              professional.categoryIds
                .map(
                  (id) => catalog.find((category) => category.id === id)?.name,
                )
                .filter(Boolean)
                .join(" · ") || "Specialist";

            return (
              <article
                key={professional.id}
                className="featured-card"
                data-scroll-reveal
                data-testid="professional-card"
              >
                <div className="featured-card-strip">
                  <span className="featured-category-pill">{categoryName}</span>
                  <span className="featured-badge">
                    <Star
                      size={11}
                      className="fill-current"
                      aria-hidden="true"
                    />
                    <span>Featured</span>
                  </span>
                </div>

                <div className="featured-card-body">
                  {connected && professional.editorialFeatured === true && (
                    <p
                      className="section-tag"
                      data-testid="editorial-selection"
                    >
                      Editorial selection
                    </p>
                  )}
                  <div className="featured-card-identity">
                    {professional.photoId ? (
                      <ProfileImage
                        src={publicProfileImageHref(
                          professional.id,
                          professional.photoId,
                        )}
                        alt={`${professional.businessName} profile image`}
                        className="featured-avatar"
                      />
                    ) : (
                      <div className="featured-avatar" aria-hidden="true">
                        {initials}
                      </div>
                    )}
                    <div>
                      <h3 className="featured-business-name">
                        {professional.businessName}
                      </h3>
                      <p className="featured-location">
                        <MapPin size={13} aria-hidden="true" />
                        <span>
                          {professional.city}, {professional.state}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="featured-specialty">{professional.specialty}</p>
                  <p className="featured-summary">{professional.summary}</p>
                </div>

                <div className="featured-card-actions">
                  <details className="featured-services">
                    <summary className="featured-services-toggle">
                      <span>Explore services</span>
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className="featured-chevron"
                      />
                      <span className="sr-only">
                        {" "}
                        at {professional.businessName}
                      </span>
                    </summary>
                    <div className="featured-services-dropdown">
                      <ul>
                        {professional.services.map((service, index) => (
                          <li key={`${index}-${service}`}>{service}</li>
                        ))}
                      </ul>
                      <p className="featured-services-note">
                        Explore the profile for service details and an inquiry
                        form.
                      </p>
                    </div>
                  </details>

                  <Link
                    className="featured-profile-link"
                    href={profileHref(professional.id)}
                  >
                    View profile <ArrowRight size={14} aria-hidden="true" />
                    <span className="sr-only">
                      for {professional.businessName}
                    </span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="featured-empty">
          {unavailable
            ? "Featured professionals are temporarily unavailable. Please try again later."
            : connected
              ? "No featured professionals are published yet. Browse categories to explore the directory."
              : "No eligible featured examples are available."}
        </p>
      )}
    </section>
  );
}
