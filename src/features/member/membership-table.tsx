"use client";
import Link from "next/link";
import {
  Search,
  Home,
  Hammer,
  Wrench,
  Ruler,
  Stethoscope,
  PawPrint,
  ChevronRight,
} from "lucide-react";
import { formatMonthlyPrice, type Category } from "@/domain/categories";
import { publicDirectoryCatalog } from "@/domain/public-application";
import { useDemoSession } from "./demo-session";

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

export function MembershipTable({ catalog }: { catalog: readonly Category[] }) {
  const { state } = useDemoSession();
  const categories = publicDirectoryCatalog(catalog, state);
  return (
    <table className="membership-table" role="table">
      <caption className="sr-only">
        Monthly professional directory memberships in USD
      </caption>
      <thead>
        <tr role="row">
          <th scope="col" role="columnheader" className="pricing-th-category">
            Professional category
          </th>
          <th scope="col" role="columnheader" className="pricing-th-membership">
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
                    <strong>{formatMonthlyPrice(category.monthlyUsd)}</strong>
                    <span>USD / month</span>
                    {state.addedCategories.some(
                      (item) => item.id === category.id,
                    ) && <span>Provisional demo price</span>}
                  </div>
                  <div className="pricing-arrow-circle" aria-hidden="true">
                    <ChevronRight size={18} strokeWidth={2} />
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
