import { applicationMode } from "@/domain/config";
import {
  ConnectedSitePage,
  siteMetadata,
} from "@/features/content/connected-pages";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const demoMetadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Restored Healthy Homes for directory inquiries and support.",
};

export async function generateMetadata() {
  return applicationMode(process.env) === "staging"
    ? siteMetadata("contact")
    : demoMetadata;
}
export default function ContactPage() {
  if (applicationMode(process.env) === "staging")
    return <ConnectedSitePage kind="contact" />;
  return (
    <div className="container public-content-page">
      <header className="public-page-intro" data-scroll-reveal>
        <div>
          <p className="public-eyebrow section-tag">Get in touch</p>
          <h1>Contact Us</h1>
        </div>
        <div className="public-intro-copy">
          <p>
            Have a question about our directory, educational pathways, or
            listing your healthy-home specialty? We are here to help.
          </p>
        </div>
      </header>

      <section data-scroll-reveal className="contact-content">
        <div>
          <h2>General inquiries</h2>
          <p>
            Public contact details are awaiting confirmation. An approved email
            address and support information will appear here before launch.
          </p>
        </div>
        <div>
          <h2>For Specialists</h2>
          <p>
            Interested in listing your business or learning more about
            membership options? Explore our membership pricing or submit an
            application directly.
          </p>
        </div>
        <div className="public-page-actions">
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
