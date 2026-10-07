import { ButtonLink } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <div className="container result-state">
      <h1>Profile not found</h1>
      <p>This profile is not available in the public directory.</p>
      <ButtonLink href="/directory">Find professionals</ButtonLink>
    </div>
  );
}
