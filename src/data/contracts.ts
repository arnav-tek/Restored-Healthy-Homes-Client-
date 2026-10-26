import type { Category } from "../domain/categories";
import type { DemoLocation, LocationResolution } from "../domain/location";
import type { SearchQuery, SearchResponse } from "../domain/directory-search";
import type { PublicProfessional, PublicProfile } from "../domain/professional";
import type { PublicQuestion, QaQuery, QaResults } from "../domain/qa";
import type { PublicReview, PublicReviewSnapshot } from "../domain/review";
import type { ResourceArticle } from "../domain/resource";
export interface ResourceRepository {
  list(): Promise<readonly ResourceArticle[]>;
  get(slug: string): Promise<ResourceArticle | null>;
}
export interface ReviewRepository {
  listPublic(professionalId: string): Promise<PublicReview[] | null>;
  publicSnapshot(): Promise<PublicReviewSnapshot>;
}
export interface QaRepository {
  listPublic(): Promise<PublicQuestion[]>;
  search(query: QaQuery): Promise<QaResults>;
  getPublicQuestion(id: string): Promise<PublicQuestion | null>;
}
export interface DirectoryRepository {
  listPublicProfiles(): Promise<PublicProfile[]>;
  listFeaturedPublic(): Promise<PublicProfessional[]>;
  getPublicProfile(id: string): Promise<PublicProfile | null>;
  getCategories(): Promise<readonly Category[]>;
  listPublic(categoryId?: string): Promise<PublicProfessional[]>;
  search(query: SearchQuery): Promise<SearchResponse>;
}
export interface LocationAdapter {
  listSupported(): Promise<readonly DemoLocation[]>;
  resolve(input: string): Promise<LocationResolution>;
}
