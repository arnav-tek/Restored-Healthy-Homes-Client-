import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Home,
  Hammer,
  Wrench,
  Ruler,
  Stethoscope,
  PawPrint,
  Users,
  FileText,
  Check,
  ChevronRight,
} from "lucide-react";
import { directoryRepository } from "@/data";
import { formatMonthlyPrice } from "@/domain/categories";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Membership Pricing",
  description:
    "Compare monthly professional directory membership prices by specialty and learn how to apply to list your business.",
};

const categoryDescriptions: Record<string, string> = {
  "mold-inspection": "List your inspection services and credentials.",
  "mold-remediation": "List your remediation services and certifications.",
  "healthy-renovations": "Showcase your renovation services and experience.",
  "healthy-builders": "Highlight your building services and credentials.",
  "healthy-trades": "List your trade services and specializations.",
  "healthy-designers": "Showcase your design services and qualifications.",
  "health-practitioners":
    "List your clinical or wellness services and credentials.",
  "mold-detection-dogs":
    "List your canine inspection services and certifications.",
};

function HouseBuildIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 10v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9" />
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M18 4.5V8" />
      <rect x="9" y="10" width="6" height="6" rx="1" />
      <line x1="12" y1="10" x2="12" y2="16" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  );
}

function getCategoryIcon(id: string) {
  switch (id) {
    case "mold-inspection":
      return Search;
    case "mold-remediation":
      return Home;
    case "healthy-renovations":
      return Hammer;
    case "healthy-builders":
      return HouseBuildIcon;
    case "healthy-trades":
      return Wrench;
    case "healthy-designers":
      return Ruler;
    case "health-practitioners":
      return Stethoscope;
    case "mold-detection-dogs":
      return PawPrint;
    default:
      return Search;
  }
}

export default async function PricingPage() {
  const categories = await directoryRepository.getCategories();

  return (
    <div className="pricing-page container">
      {/* Hero Section */}
      <header className="pricing-hero">
        <div className="pricing-hero-left">
          <p className="pricing-eyebrow">
            <span className="pricing-eyebrow-line" aria-hidden="true">— </span>
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

        <div className="pricing-hero-card">
          <div className="pricing-benefit-item">
            <div className="pricing-benefit-icon" aria-hidden="true">
              <Users size={20} strokeWidth={1.75} />
            </div>
            <div className="pricing-benefit-content">
              <h2 className="pricing-benefit-title">Simple, transparent pricing</h2>
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
              <h2 className="pricing-benefit-title">Build credibility and visibility</h2>
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
        <div className="pricing-section-heading">
          <h2 id="membership-heading">Find your membership</h2>
          <p>Compare monthly membership prices for your specialty.</p>
        </div>

        <div className="pricing-table-card">
          <table className="membership-table" role="table">
            <caption className="sr-only">
              Monthly professional directory memberships in USD
            </caption>
            <thead>
              <tr role="row">
                <th
                  scope="col"
                  role="columnheader"
                  className="pricing-th-category"
                >
                  Professional category
                </th>
                <th
                  scope="col"
                  role="columnheader"
                  className="pricing-th-membership"
                >
                  Monthly membership
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const CategoryIcon = getCategoryIcon(category.id);
                const description =
                  categoryDescriptions[category.id] ?? category.description;

                return (
                  <tr
                    key={category.id}
                    data-category-id={category.id}
                    role="row"
                    className="pricing-row"
                  >
                    <th
                      scope="row"
                      role="rowheader"
                      className="pricing-category-cell"
                    >
                      <div className="pricing-category-cell-inner">
                        <div
                          className="pricing-category-icon-wrap"
                          aria-hidden="true"
                        >
                          <CategoryIcon size={20} strokeWidth={1.75} />
                        </div>
                        <div className="pricing-category-text">
                          <span className="pricing-category-title">
                            {category.name}
                          </span>
                          <p className="pricing-category-desc">{description}</p>
                          <Link
                            href="/list-your-business"
                            className="pricing-category-link"
                          >
                            Apply to list your business{" "}
                            <span aria-hidden="true">→</span>
                            <span className="sr-only"> — {category.name}</span>
                          </Link>
                        </div>
                      </div>
                    </th>
                    <td role="cell" className="pricing-price-cell">
                      <div className="pricing-price-cell-inner">
                        <div className="pricing-price-stack">
                          <strong>
                            {formatMonthlyPrice(category.monthlyUsd)}
                          </strong>
                          <span>USD / month</span>
                        </div>
                        <div
                          className="pricing-arrow-circle"
                          aria-hidden="true"
                        >
                          <ChevronRight size={18} strokeWidth={2} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Before you apply section */}
      <section
        className="membership-guidance pricing-guidance-section"
        aria-labelledby="before-applying"
      >
        <div className="pricing-guidance-grid">
          {/* Left card: Checklist card */}
          <div className="pricing-guidance-card pricing-guidance-checklist-card">
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
                    A public listing requires admin approval, active membership and
                    no suspension.
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
                  Multi-category pricing is pending confirmation; no combined total
                  is quoted.
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
          <aside className="pricing-guidance-card pricing-guidance-cta-card">
            <div className="pricing-cta-icon-box" aria-hidden="true">
              <Home size={20} strokeWidth={1.75} />
            </div>
            <p className="pricing-cta-eyebrow">START WITH AN APPLICATION</p>
            <h3>List your business in the directory.</h3>
            <p className="pricing-cta-copy">
              Explore the application process and choose the membership that suits your business. No payment is collected here.
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
