// Public editorial content only. Replace placeholders after client approval.
// Asset paths are local; no third-party player or requests are needed.
type LocalAsset = `/${string}`;
interface AboutContent {
  introduction: string;
  story: { heading: string; label: string; body: string };
  purpose: { heading: string; label: string; body: string };
  video: {
    heading: string;
    placeholder: string;
    src: LocalAsset | null;
    poster: LocalAsset | null;
    captions: { src: LocalAsset; language: string; label: string } | null;
    transcript: { href: LocalAsset; label: string } | null;
  };
}
export const aboutContent: AboutContent = {
  introduction:
    "A place to explore the people and specialties involved in healthier homes, from investigating a concern to planning a new space.",
  story: {
    heading: "Our company story",
    label: "Client story pending",
    body: "A space for the story behind Restored Healthy Homes, in the company’s own words.",
  },
  purpose: {
    heading: "Why this directory exists",
    label: "Provisional purpose copy",
    body: "Home projects can span different specialties. Bringing them together helps visitors explore services, understand each professional’s focus and prepare for a conversation.",
  },
  video: {
    heading: "The story, in their own words.",
    placeholder: "Professionally produced video awaiting approval.",
    src: null,
    poster: null,
    captions: null,
    transcript: null,
  },
};
