import { ButtonLink } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="container result-state">
      <h1>This page could not be found.</h1>
      <p>Explore the directory to find your next step.</p>
      <ButtonLink href="/directory">Find Specialists</ButtonLink>
    </div>
  );
}
