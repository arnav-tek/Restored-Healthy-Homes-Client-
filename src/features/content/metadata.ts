import "server-only";
import type { Metadata } from "next";
import { publicContent } from "@/data/supabase/site-content";
import { contentLabels, type ContentKind } from "@/domain/site-content";
const fallback = (kind: ContentKind) => ({
  title: contentLabels[kind],
  description: "Approved content will appear here when available.",
  robots: { index: false, follow: true },
});
export async function siteMetadata(
  kind: ContentKind,
  key: string = kind,
): Promise<Metadata> {
  try {
    const item = (await publicContent(kind, key)).items[0];
    return item
      ? {
          title: item.fields.title || item.fields.providerName,
          description: item.fields.summary || item.fields.introduction,
        }
      : fallback(kind);
  } catch {
    return fallback(kind);
  }
}
