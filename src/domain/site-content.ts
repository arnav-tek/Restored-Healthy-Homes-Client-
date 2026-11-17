export const contentKinds = [
  "resource",
  "pathway",
  "about",
  "contact",
  "terms",
  "privacy",
  "disclaimer",
] as const;
export type ContentKind = (typeof contentKinds)[number];
export const contentLabels: Record<ContentKind, string> = {
  resource: "Resource article",
  pathway: "Education pathway",
  about: "About Us",
  contact: "Contact",
  terms: "Terms",
  privacy: "Privacy",
  disclaimer: "Disclaimer",
};
// Plain text only. URLs have separate validated fields; never interpret editor HTML.
export const contentFields: Record<
  ContentKind,
  Readonly<Record<string, readonly [string, number]>>
> = {
  resource: {
    title: ["Title", 120],
    summary: ["Summary", 350],
    category: ["Resource category", 30],
    body: ["Article body", 10000],
  },
  pathway: {
    introduction: ["Pathway introduction", 500],
    providerName: ["Provider / program name", 160],
    providerUrl: ["Provider URL", 400],
    kind: ["Program type", 50],
    description: ["Program description", 1500],
    requirements: ["Entry requirements", 1500],
    steps: ["General steps (one per line)", 2000],
    timeline: ["Typical timeline", 500],
    costs: ["External program costs", 700],
  },
  about: {
    title: ["Title", 120],
    summary: ["Introduction", 350],
    story: ["Company story", 10000],
    why: ["Our why", 5000],
    videoSrc: ["Approved video path", 500],
    posterSrc: ["Approved poster path", 500],
    captionsSrc: ["Approved captions path", 500],
    transcript: ["Video transcript", 10000],
  },
  contact: {
    title: ["Title", 120],
    summary: ["Introduction", 350],
    body: ["Support information", 5000],
    email: ["Approved public email", 254],
    phone: ["Approved public phone", 40],
  },
  terms: {
    title: ["Title", 120],
    summary: ["Page description", 350],
    body: ["Client-supplied terms", 30000],
  },
  privacy: {
    title: ["Title", 120],
    summary: ["Page description", 350],
    body: ["Client-supplied privacy wording", 30000],
  },
  disclaimer: {
    title: ["Title", 120],
    summary: ["Page description", 350],
    body: ["Client-supplied disclaimer", 10000],
  },
};
export type ContentFields = Record<string, string>;
export interface PublishedContent {
  kind: ContentKind;
  key: string;
  fields: ContentFields;
}
export interface ContentDocument extends PublishedContent {
  id: string;
  version: number;
  published: PublishedContent | null;
  publishedVersion: number | null;
}
export interface ContentHistory {
  id: string;
  action: string;
  version: number;
  at: string;
  reason: string;
}
export interface ContentWorkspace {
  items: ContentDocument[];
  history: ContentHistory[];
  page: number;
  total: number;
}
export function emptyContent(kind: ContentKind): ContentFields {
  return Object.fromEntries(
    Object.keys(contentFields[kind]).map((key) => [key, ""]),
  );
}
