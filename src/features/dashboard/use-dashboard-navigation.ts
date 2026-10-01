"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  dashboardHref,
  parseDashboardQuery,
  type DashboardArea,
  type DashboardQuery,
} from "@/validation/dashboard";

export function useDashboardNavigation(area: DashboardArea) {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const query = parseDashboardQuery(area, params);
  return {
    query,
    pending,
    href: (patch: Partial<DashboardQuery>) => dashboardHref(area, query, patch),
    navigate: (patch: Partial<DashboardQuery>) =>
      startTransition(() =>
        router.push(dashboardHref(area, query, patch), { scroll: false }),
      ),
  };
}
