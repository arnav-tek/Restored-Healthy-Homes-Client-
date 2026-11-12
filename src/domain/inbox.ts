export type InquirySubmission = {
  professionalId: string;
  requestId: string;
  name: string;
  email: string;
  message: string;
};
export type InboxItem = {
  id: string;
  name: string;
  createdAt: string;
  readAt: string | null;
};
export type InboxPage = { items: InboxItem[]; page: number; hasNext: boolean };
export type InboxDetail = InboxItem & {
  professionalId: string;
  email: string;
  message: string;
  version: number;
};
