import type { Metadata } from "next";
import { directoryRepository } from "@/data";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { MemberWorkspace } from "@/features/member/member-workspace";
export const metadata: Metadata = { title: "Member dashboard" };
export default async function Member() {
  const catalog = (await directoryRepository.getCategories()).map(
    ({ id, name, monthlyUsd }) => ({ id, name, monthlyUsd }),
  );
  return (
    <DashboardShell area="member">
      <MemberWorkspace catalog={catalog} />
    </DashboardShell>
  );
}
