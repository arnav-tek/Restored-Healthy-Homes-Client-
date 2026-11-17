import { applicationMode } from "@/domain/config";
import { aboutContent } from "@/data/content/about";
import { AboutView } from "@/features/content/about-view";
import {
  ConnectedSitePage,
  siteMetadata,
} from "@/features/content/connected-pages";
export async function generateMetadata() {
  return applicationMode(process.env) === "staging"
    ? siteMetadata("about")
    : {
        title: "About Us",
        description:
          "Explore the purpose of Restored Healthy Homes and the specialties behind healthier homes.",
      };
}
export default function AboutPage() {
  return applicationMode(process.env) === "staging" ? (
    <ConnectedSitePage kind="about" />
  ) : (
    <AboutView content={aboutContent} />
  );
}
