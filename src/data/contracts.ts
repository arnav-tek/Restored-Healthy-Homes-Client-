import type { Category } from "../domain/categories";
import type { DemoLocation, LocationResolution } from "../domain/location";
import type { SearchQuery, SearchResponse } from "../domain/directory-search";
import type { PublicProfessional, PublicProfile } from "../domain/professional";
import type { PublicQuestion, QaQuery, QaResults } from "../domain/qa";
export interface QaRepository {
  search(query: QaQuery): Promise<QaResults>;
  getPublicQuestion(id: string): Promise<PublicQuestion | null>;
}
export interface DirectoryRepository {
  getPublicProfile(id: string): Promise<PublicProfile | null>;
  getCategories(): Promise<readonly Category[]>;
  listPublic(categoryId?: string): Promise<PublicProfessional[]>;
  search(query: SearchQuery): Promise<SearchResponse>;
}
export interface LocationAdapter {
  listSupported(): Promise<readonly DemoLocation[]>;
  resolve(input: string): Promise<LocationResolution>;
}
