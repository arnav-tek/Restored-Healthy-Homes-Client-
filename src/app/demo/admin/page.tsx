import type { Metadata } from "next";
import { directoryRepository } from "@/data";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { AdminWorkspace } from "@/features/admin/admin-workspace";
export const metadata: Metadata = { title: "Admin dashboard" };
export default async function Admin() {
  const catalog = (await directoryRepository.getCategories()).map(
    ({ id, name, monthlyUsd }) => ({ id, name, monthlyUsd }),
  );
  return (
    <DashboardShell area="admin">
      <AdminWorkspace catalog={catalog} />
    </DashboardShell>
  );
}
