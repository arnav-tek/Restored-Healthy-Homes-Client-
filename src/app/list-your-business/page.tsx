import type { Metadata } from "next";
import { directoryRepository } from "@/data";
import { Notice } from "@/components/ui/notice";
import { ApplicationExperience } from "@/features/member/application-experience";
export const metadata: Metadata = {
  title: "List Your Business",
};
export default async function ApplicationPage() {
  const catalog = (await directoryRepository.getCategories()).map(
    ({ id, name, monthlyUsd }) => ({ id, name, monthlyUsd }),
  );
  return (
    <div className="container application-page">
      <header className="page-heading">
        <p className="section-label">For healthy-home professionals</p>
        <h1>List Your Business</h1>
        <p>Introduce your business, services and professional specialties.</p>
      </header>
      <Notice>
        Applications stay in this tab and are not sent or saved permanently.
        Refreshing clears your entries.
      </Notice>
      <ApplicationExperience catalog={catalog} />
    </div>
  );
}
