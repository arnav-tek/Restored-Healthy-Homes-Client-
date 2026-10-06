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
    body: "The story behind Restored Healthy Homes will appear here in the client’s own words. Final company history and supporting copy are awaiting approval.",
  },
  purpose: {
    heading: "Why this directory exists",
    label: "Provisional purpose copy",
    body: "Finding a starting point can be difficult when a project spans different specialties. This directory is designed to help visitors explore services, understand each professional’s focus and prepare for a conversation. The client’s personal “Why” will replace this introduction once supplied.",
  },
  video: {
    heading: "The story, in their own words.",
    placeholder:
      "The client’s professionally produced video will appear here once supplied and approved.",
    src: null,
    poster: null,
    captions: null,
    transcript: null,
  },
};
