import type { PublicReview } from "../../domain/review";
import "server-only";
import { loadPublicDirectory } from "./public-directory";
import { categories } from "../../domain/categories";
import type { Category } from "../../domain/categories";
import type { PublicProfile } from "../../domain/professional";
export interface ConnectedHomeSnapshot {
  catalog: Category[];
  profiles: PublicProfile[];
  reviews: PublicReview[];
  featured: PublicProfile[];
  unavailable: boolean;
}
export async function loadConnectedHome(): Promise<ConnectedHomeSnapshot> {
  try {
    const data = await loadPublicDirectory();
    return {
      catalog: data.catalog
        .filter((c) => c.active)
        .map((c) => ({
          ...c,
          description:
            c.description ||
            categories.find((item) => item.id === c.id)?.description ||
            "",
          billingKey: "",
        })),
      profiles: data.profiles,
      reviews: data.reviews,
      featured: data.profiles.filter(
        (p) => p.featured || p.editorialFeatured === true,
      ),
      unavailable: false,
    };
  } catch {
    return {
      catalog: [],
      profiles: [],
      featured: [],
      reviews: [],
      unavailable: true,
    };
  }
}
