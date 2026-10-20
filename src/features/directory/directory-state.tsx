import { SearchX, CircleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
export function EmptyDirectory() {
  return (
    <div className="result-state">
      <SearchX size={30} aria-hidden="true" />
      <h2>No matching professionals</h2>
      <p>
        No businesses match these filters. Try a broader keyword, another
        specialty, another state, a lower minimum rating or a larger radius
        around a supported location.
      </p>
      <ButtonLink href="/directory">Browse specialists</ButtonLink>
    </div>
  );
}
export function DirectoryUnavailable({
  href = "/directory",
}: {
  href?: string;
}) {
  return (
    <div className="result-state" role="alert">
      <CircleAlert size={30} aria-hidden="true" />
      <h2>The directory couldn’t load</h2>
      <p>Try loading the directory again. Your search filters will be kept.</p>
      <a className="button" href={href}>
        Try again
      </a>
    </div>
  );
}
