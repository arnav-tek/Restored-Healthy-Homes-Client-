import { applicationMode } from "@/domain/config";
import { LegalPlaceholder } from "@/components/site/legal-placeholder";
import {
  ConnectedSitePage,
  siteMetadata,
} from "@/features/content/connected-pages";
export async function generateMetadata() {
  return applicationMode(process.env) === "staging"
    ? siteMetadata("privacy")
    : {
        title: "Privacy Policy",
        description: "Legal wording awaits client approval before launch.",
      };
}
export default function LegalPage() {
  return applicationMode(process.env) === "staging" ? (
    <ConnectedSitePage kind="privacy" />
  ) : (
    <LegalPlaceholder title="Privacy Policy" />
  );
}
