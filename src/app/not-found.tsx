import { ButtonLink } from "@/components/ui/button";
import { applicationMode } from "@/domain/config";
export default function NotFound() {
  const connected = applicationMode(process.env) === "staging";
  return (
    <div className="container result-state">
      <h1>This page could not be found.</h1>
      <p>
        {connected
          ? "Return home or explore the directory to continue."
          : "Explore the directory to find your next step."}
      </p>
      <ButtonLink href={connected ? "/" : "/directory"}>
        {connected ? "Return home" : "Find Specialists"}
      </ButtonLink>
    </div>
  );
}
