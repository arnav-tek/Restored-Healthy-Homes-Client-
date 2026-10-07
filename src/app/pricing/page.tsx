import type { Metadata } from "next";
import Link from "next/link";
import { directoryRepository } from "@/data";
import { formatMonthlyPrice } from "@/domain/categories";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Membership Pricing",
  description:
    "Compare monthly professional directory membership prices by specialty and learn how to apply to list your business.",
};
export default async function PricingPage() {
  const categories = await directoryRepository.getCategories();
  return (
    <div className="pricing-page container">
      <header className="public-page-intro">
        <div>
          <p className="public-eyebrow">Professional directory memberships</p>
          <h1>
            A place for your
            <br />
            professional practice.
          </h1>
        </div>
        <div className="public-intro-copy">
          <p>
            Choose the specialty that reflects your work. A directory profile
            introduces your business, services and listed credentials to people
            exploring healthier homes.
          </p>
          <p>
            All prices below are monthly, in USD. External training and
            certification costs are separate.
          </p>
          <ButtonLink href="/list-your-business">
            Apply to list your business
          </ButtonLink>
        </div>
      </header>
      <section
        className="membership-comparison"
        aria-labelledby="membership-heading"
      >
        <div className="public-section-heading">
          <h2 id="membership-heading">Find your membership</h2>
          <p>Compare monthly membership prices for your specialty.</p>
        </div>
        <table className="membership-table">
          <caption className="sr-only">
            Monthly professional directory memberships in USD
          </caption>
          <thead>
            <tr>
              <th scope="col">Professional category</th>
              <th scope="col">Monthly membership</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} data-category-id={category.id}>
                <th scope="row">
                  <span>{category.name}</span>
                  <Link href="/list-your-business">
                    Apply to list your business
                    <span className="sr-only"> — {category.name}</span>{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                </th>
                <td>
                  <strong>{formatMonthlyPrice(category.monthlyUsd)}</strong>
                  <span>USD / month</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section
        className="membership-guidance"
        aria-labelledby="before-applying"
      >
        <div>
          <h2 id="before-applying">Before you apply</h2>
          <p>
            A public listing requires admin approval, active membership and no
            suspension. Approval alone does not publish a listing.
          </p>
          <p>
            Selecting multiple categories is supported in the application.
            Multi-category pricing is pending confirmation; no combined total is
            quoted.
          </p>
        </div>
        <aside>
          <h3>Start with an application</h3>
          <p>
            The current application is a demo: use fictional information.
            Nothing is sent or saved permanently, and no payment is collected.
          </p>
          <ButtonLink href="/list-your-business">
            Apply to list your business
          </ButtonLink>
          <Link className="public-text-link" href="/education">
            Explore education pathways →
          </Link>
        </aside>
      </section>
    </div>
  );
}
