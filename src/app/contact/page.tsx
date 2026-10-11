import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Restored Healthy Homes for directory inquiries and support.",
};

export default function ContactPage() {
  return (
    <div
      className="container public-content-page"
      style={{ paddingBlock: "64px 80px" }}
    >
      <header className="public-page-intro">
        <div>
          <p className="public-eyebrow">Get in touch</p>
          <h1>Contact Us</h1>
        </div>
        <div className="public-intro-copy">
          <p>
            Have a question about our directory, educational pathways, or
            listing your healthy-home specialty? We are here to help.
          </p>
        </div>
      </header>

      <section
        style={{
          maxWidth: "720px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>
            General inquiries
          </h2>
          <p style={{ color: "#575c4c", lineHeight: 1.65 }}>
            Public contact details are awaiting confirmation. An approved email
            address and support information will appear here before launch.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>
            For professionals
          </h2>
          <p style={{ color: "#575c4c", lineHeight: 1.65 }}>
            Interested in listing your business or learning more about
            membership options? Explore our membership pricing or submit an
            application directly.
          </p>
        </div>
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <ButtonLink href="/list-your-business">
            List Your Business <ArrowRight size={16} aria-hidden="true" />
          </ButtonLink>
          <Link href="/pricing" className="text-link">
            Membership pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
