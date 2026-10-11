import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/site/legal-placeholder";
export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy wording awaits client approval before launch.",
};
export default function PrivacyPage() {
  return <LegalPlaceholder title="Privacy Policy" />;
}
