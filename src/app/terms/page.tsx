import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Review the terms and directory participation policies for Restored Healthy Homes.",
};

export default function TermsPage() {
  return (
    <div className="container public-content-page" style={{ paddingBlock: "64px 80px" }}>
      <header className="public-page-intro">
        <div>
          <p className="public-eyebrow">Platform terms</p>
          <h1>Terms of Service</h1>
        </div>
        <div className="public-intro-copy">
          <p>
            Restored Healthy Homes connects homeowners with independent
            healthy-home professionals. Use of the directory, inquiry workflows
            and professional listings is subject to our terms of service.
          </p>
        </div>
      </header>

      <section style={{ maxWidth: "720px", display: "flex", flexDirection: "column", gap: "28px" }}>
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>Directory participation</h2>
          <p style={{ color: "#575c4c", lineHeight: 1.65 }}>
            Professionals listed in the directory represent their own independent
            businesses, practices, and services. Restored Healthy Homes verifies
            public listings according to our published standards but does not
            directly employ or guarantee third-party contractor outcomes.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>Client consultations & inquiries</h2>
          <p style={{ color: "#575c4c", lineHeight: 1.65 }}>
            Communications and consultation requests initiated through the
            platform facilitate initial contact between homeowners and
            specialists. Specific service scopes, agreements, and fees are
            contracted directly between homeowners and professionals.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>Questions & updates</h2>
          <p style={{ color: "#575c4c", lineHeight: 1.65 }}>
            For questions about our platform policies, please contact our
            editorial team.
          </p>
        </div>
        <div style={{ marginTop: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
          <ButtonLink href="/directory">
            Browse professionals <ArrowRight size={16} aria-hidden="true" />
          </ButtonLink>
          <Link href="/about" className="text-link">
            About Us
          </Link>
        </div>
      </section>
    </div>
  );
}
