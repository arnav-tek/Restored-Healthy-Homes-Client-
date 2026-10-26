"use client";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  Shield,
  Hammer,
  House,
  Wrench,
  Ruler,
  HeartPulse,
  Dog,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/domain/categories";
import { publicDirectoryCatalog } from "@/domain/public-application";
import { useDemoSession } from "@/features/member/demo-session";

// Presentation only; names and descriptions continue to come from the catalog.
const categoryIcons: Readonly<Record<string, LucideIcon>> = {
  "mold-inspection": Search,
  "mold-remediation": Shield,
  "healthy-renovations": Hammer,
  "healthy-builders": House,
  "healthy-trades": Wrench,
  "healthy-designers": Ruler,
  "health-practitioners": HeartPulse,
  "mold-detection-dogs": Dog,
};

const highlightedCategories = new Set([
  "mold-remediation",
  "health-practitioners",
]);

export function CategoryBrowse({
  catalog: initialCatalog,
}: {
  catalog: readonly Category[];
}) {
  const { state } = useDemoSession();
  const catalog = publicDirectoryCatalog(initialCatalog, state);
  return (
    <section
      className="container home-section category-browse-section"
      aria-labelledby="category-heading"
    >
      <div
        className="home-section-heading category-browse-header"
        data-scroll-reveal
      >
        <div className="category-header-main">
          <div className="category-pill-row">
            <span className="category-pill section-tag">SPECIALTY</span>
          </div>
          <h2 id="category-heading">
            Find the specialty you <br className="category-heading-break" />
            need.
          </h2>
        </div>
      </div>
      <ul
        className="home-categories"
        aria-label="Browse specialties"
        data-scroll-stagger
      >
        {catalog.map((category) => {
          const Icon = categoryIcons[category.id] ?? House;
          const isHighlighted = highlightedCategories.has(category.id);
          return (
            <li key={category.id} data-scroll-reveal>
              <Link
                href={`/directory?category=${encodeURIComponent(category.id)}`}
                className={`category-card ${isHighlighted ? "category-card-accent" : ""}`}
              >
                <div className="category-card-header">
                  <div className="category-icon-circle" aria-hidden="true">
                    <Icon size={22} className="category-icon" />
                  </div>
                  <div className="category-arrow-circle" aria-hidden="true">
                    <ArrowRight size={15} />
                  </div>
                </div>
                <div className="category-copy">
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
