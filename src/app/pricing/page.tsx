import type { Metadata } from "next";
import Link from "next/link";
import { Users, FileText, Check, Home } from "lucide-react";
import { directoryRepository } from "@/data";
import { ButtonLink } from "@/components/ui/button";
import { MembershipTable } from "@/features/member/membership-table";

export const metadata: Metadata = {
  title: "Membership Pricing",
  description:
    "Compare monthly professional directory membership prices by specialty and learn how to apply to list your business.",
};

export default async function PricingPage() {
  const categories = await directoryRepository.getCategories();

  return (
    <div className="pricing-page container">
      {/* Hero Section */}
      <header className="pricing-hero">
        <div className="pricing-hero-left" data-scroll-reveal>
          <p className="pricing-eyebrow section-tag">

            PROFESSIONAL DIRECTORY MEMBERSHIPS
          </p>
          <h1 className="pricing-hero-title">
            A place for your
            <br />
            professional practice.
          </h1>
          <p className="pricing-hero-copy">
            Choose the specialty that reflects your work. A directory profile
            introduces your business, services and listed credentials to people
            exploring healthier homes.
          </p>
        </div>

        <div className="pricing-hero-card" data-scroll-reveal>
          <div className="pricing-benefit-item">
            <div className="pricing-benefit-icon" aria-hidden="true">
              <Users size={20} strokeWidth={1.75} />
            </div>
            <div className="pricing-benefit-content">
              <h2 className="pricing-benefit-title">
                Simple, transparent pricing
              </h2>
              <p className="pricing-benefit-text">
                All prices below are monthly, in USD. External training and
                certification costs are separate.
              </p>
            </div>
          </div>

          <div className="pricing-benefit-item">
            <div className="pricing-benefit-icon" aria-hidden="true">
              <FileText size={20} strokeWidth={1.75} />
            </div>
            <div className="pricing-benefit-content">
              <h2 className="pricing-benefit-title">
                Build credibility and visibility
              </h2>
              <p className="pricing-benefit-text">
                Reach homeowners and businesses looking for healthy-home
                professionals.
              </p>
            </div>
          </div>

          <ButtonLink href="/list-your-business" className="pricing-hero-cta">
            Apply to list your business <span aria-hidden="true">→</span>
          </ButtonLink>
        </div>
      </header>

      {/* Membership Pricing Section */}
      <section
        className="membership-comparison pricing-section"
        aria-labelledby="membership-heading"
      >
        <div className="pricing-section-heading" data-scroll-reveal>
          <h2 id="membership-heading">Find your membership</h2>
          <p>Compare monthly membership prices for your specialty.</p>
        </div>

        <div className="pricing-table-card" data-scroll-reveal>
          <MembershipTable catalog={categories} />
        </div>
      </section>

{/* Before you apply section */}
      <section
        className="membership-guidance pricing-guidance-section"
        aria-labelledby="before-applying"
      >
        <div className="pricing-guidance-grid" data-scroll-stagger>
          {/* Left card: Checklist card */}
          <div className="pricing-guidance-card pricing-guidance-checklist-card" data-scroll-reveal>
            <div className="pricing-card-header">
              <div className="pricing-card-header-icon" aria-hidden="true">
                <FileText size={20} strokeWidth={1.75} />
              </div>
              <h2 id="before-applying">Before you apply</h2>
            </div>
            <ul className="pricing-checklist">
              <li className="pricing-checklist-item">
                <div className="pricing-check-bullet" aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </div>
                <p>
                  <strong>
                    A public listing requires admin approval, active membership.
                  </strong>{" "}
                  Approval alone does not publish a listing.
                </p>
              </li>
              <li className="pricing-checklist-item">
                <div className="pricing-check-bullet" aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </div>
                <p>
                  <strong>
                    Selecting multiple categories is supported in the
                    application.
                  </strong>{" "}
                  Multi-category pricing is pending confirmation; no combined
                  total is quoted.
                </p>
              </li>
              <li className="pricing-checklist-item">
                <div className="pricing-check-bullet" aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </div>
                <p>
                  <strong>All prices are monthly, in USD.</strong> External
                  training and certification costs are separate.
                </p>
              </li>
            </ul>
          </div>

          {/* Right card: Soft-sage CTA card with terracotta left border */}
          <aside className="pricing-guidance-card pricing-guidance-cta-card" data-scroll-reveal>
            <div className="pricing-cta-icon-box" aria-hidden="true">
              <Home size={20} strokeWidth={1.75} />
            </div>
            <p className="pricing-cta-eyebrow section-tag">START WITH AN APPLICATION</p>
            <h3>List your business in the directory.</h3>
            <p className="pricing-cta-copy">
              Explore the application process and choose the membership that
              suits your business. No payment is collected here.
            </p>
            <div className="pricing-cta-actions">
              <ButtonLink
                href="/list-your-business"
                className="pricing-cta-btn"
              >
                Apply to list your business <span aria-hidden="true">→</span>
              </ButtonLink>
              <Link className="pricing-education-link" href="/education">
                Explore education pathways <span aria-hidden="true">→</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
