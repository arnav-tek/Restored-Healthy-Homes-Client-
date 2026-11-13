import { notFound } from "next/navigation";
import Link from "next/link";
import { pendingPublicSections } from "@/domain/connected-public-routes";
export default async function Availability({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await searchParams;
  const title =
    typeof section === "string" ? pendingPublicSections[section] : undefined;
  if (!title) notFound();
  return (
    <div className="container result-state">
      <h1>{title ?? "Page unavailable"}</h1>
      <p>
        This section is not available in the connected staging preview yet. No
        request or booking has been made.
      </p>
      <p>
        <Link className="text-link" href="/directory">
          Find professionals
        </Link>{" "}
        · <Link href="/">Return home</Link>
      </p>
    </div>
  );
}
