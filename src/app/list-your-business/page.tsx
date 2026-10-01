import type { Metadata } from "next";
import { directoryRepository } from "@/data";
import { Notice } from "@/components/ui/notice";
import { ApplicationExperience } from "@/features/member/application-experience";
export const metadata: Metadata = {
  title: "List Your Business | Demo application",
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
        <p>
          Try a fictional application and explore your demo member workspace.
        </p>
      </header>
      <Notice>
        <strong>Demo application.</strong> Use fictional information only.
        Nothing is sent to the owner or saved permanently. Entries remain only
        in this tab until refresh or reset. No dashboard, login or payment is
        required.
      </Notice>
      <ApplicationExperience catalog={catalog} />
    </div>
  );
}
