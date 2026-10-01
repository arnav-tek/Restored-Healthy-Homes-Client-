import { ButtonLink } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="container result-state">
      <h1>This page isn’t in the preview.</h1>
      <p>Explore the directory to see what’s ready.</p>
      <ButtonLink href="/directory">Open directory</ButtonLink>
    </div>
  );
}
