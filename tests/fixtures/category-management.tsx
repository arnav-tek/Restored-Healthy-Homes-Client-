import { createRoot, hydrateRoot } from "react-dom/client";
import { ConnectedCategories } from "../../src/features/admin/connected-categories";
import type { AdminCategories } from "../../src/domain/admin-categories";
const root = document.getElementById("root")!;
const data = JSON.parse(
  document.getElementById("fixture-data")!.textContent!,
) as AdminCategories;
if (location.pathname === "/")
  hydrateRoot(root, <ConnectedCategories initial={data} />);
else
  createRoot(root).render(
    <p>Controlled category fixture. No live account or database.</p>,
  );
