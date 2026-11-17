import type { ConsultationStatus } from "./consultation";
export interface ConsultationItem {
  id: string;
  categoryId: string;
  categoryName?: string;
  topic: string;
  format: string;
  status: ConsultationStatus;
  version: number;
  professionalId: string | null;
  createdAt: string;
  name?: string;
  email?: string;
  note?: string;
}
export interface ConsultationWorkspace {
  items: ConsultationItem[];
  page: number;
  hasNext: boolean;
  candidates: { id: string; name: string; categoryIds: string[] }[];
}
export interface ConsultationReceipt {
  requestId: string;
  status: ConsultationStatus;
  version: number;
  categoryId: string;
}
