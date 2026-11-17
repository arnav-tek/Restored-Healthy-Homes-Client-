import { createRoot, hydrateRoot } from "react-dom/client";
import { useSyncExternalStore } from "react";
import { ConnectedConsultationRequest } from "../../src/features/consultations/connected-request";
import { ConnectedConsultationWorkspace } from "../../src/features/consultations/connected-workspace";
import { ConsultationPreference } from "../../src/features/member/consultation-preference";
import type { ConsultationWorkspace } from "../../src/domain/connected-consultations";
export const categories = [
  { id: "mold-inspection", name: "Mold Testing / Inspectors" },
];
export function workspace(page: number): ConsultationWorkspace {
  return {
    page,
    hasNext: page < 3,
    items: Array.from({ length: page === 3 ? 2 : 20 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String((page - 1) * 20 + i + 1).padStart(12, "0")}`,
      version: 1,
      categoryId: "mold-inspection",
      topic: `Synthetic consultation ${(page - 1) * 20 + i + 1}`,
      format: "phone",
      status: "requested",
      professionalId: null,
      createdAt: "2026-11-15T00:00:00Z",
      name: "Synthetic visitor",
      email: "fixture@example.invalid",
      note: "",
    })),
    candidates: [
      {
        id: "00000000-0000-4000-8000-999999999999",
        name: "Synthetic specialist",
        categoryIds: ["mold-inspection"],
      },
    ],
  };
}
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}
function Harness() {
  const search = useSyncExternalStore(
      subscribe,
      () => location.search,
      () => "",
    ),
    params = new URLSearchParams(search);
  const identity = params.get("identity") ?? "a",
    admin = params.get("scope") !== "member",
    page = Number(params.get("page") ?? 1);
  return (
    <ConnectedConsultationWorkspace
      key={`${identity}:${admin}`}
      initial={workspace(page)}
      initialError={params.has("fail") ? "Synthetic server page failure" : ""}
      admin={admin}
    />
  );
}
if (typeof document !== "undefined") {
  const root = document.getElementById("root")!;
  if (location.pathname === "/workspace") createRoot(root).render(<Harness />);
  else if (location.pathname === "/participation")
    createRoot(root).render(<ConsultationPreference />);
  else
    hydrateRoot(root, <ConnectedConsultationRequest categories={categories} />);
}
