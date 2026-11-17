import { applicationMode } from "@/domain/config";
import { LegalPlaceholder } from "@/components/site/legal-placeholder";
import {
  ConnectedSitePage,
  siteMetadata,
} from "@/features/content/connected-pages";
export async function generateMetadata() {
  return applicationMode(process.env) === "staging"
    ? siteMetadata("disclaimer")
    : {
        title: "Disclaimer",
        description: "Legal wording awaits client approval before launch.",
      };
}
export default function LegalPage() {
  return applicationMode(process.env) === "staging" ? (
    <ConnectedSitePage kind="disclaimer" />
  ) : (
    <LegalPlaceholder title="Disclaimer" />
  );
}
