import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy and data protection guidelines for homeowners and directory professionals.",
};

export default function PrivacyPage() {
  return (
    <div className="container public-content-page" style={{ paddingBlock: "64px 80px" }}>
      <header className="public-page-intro">
        <div>
          <p className="public-eyebrow">Data & privacy</p>
          <h1>Privacy Policy</h1>
        </div>
        <div className="public-intro-copy">
          <p>
            We respect your privacy and are committed to handling your personal
            information transparently, thoughtfully, and securely.
          </p>
        </div>
      </header>

      <section style={{ maxWidth: "720px", display: "flex", flexDirection: "column", gap: "28px" }}>
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>Information we collect</h2>
          <p style={{ color: "#575c4c", lineHeight: 1.65 }}>
            We collect information provided directly by directory members during
            application and profile management, as well as contact details
            submitted through homeowner inquiries and consultation requests.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>How information is used</h2>
          <p style={{ color: "#575c4c", lineHeight: 1.65 }}>
            Professional contact details are published solely to connect clients
            with healthy-home specialists. We do not sell or trade personal
            information to third parties.
          </p>
        </div>
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>Data protection & confidentiality</h2>
          <p style={{ color: "#575c4c", lineHeight: 1.65 }}>
            Personal inquiries and account records are protected according to our
            confidentiality standards. We employ reasonable security safeguards
            to protect your information against unauthorized access.
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
