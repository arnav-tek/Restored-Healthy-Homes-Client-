import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/site/legal-placeholder";
export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service wording awaits client approval before launch.",
};
export default function TermsPage() {
  return <LegalPlaceholder title="Terms of Service" />;
}
