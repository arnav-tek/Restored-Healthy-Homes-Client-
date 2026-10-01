import type { DemoMemberRecord } from "@/domain/demo-member";
import type { ApplicationCategory } from "@/features/member/profile-fields-form";
import { DecisionForm } from "./decision-form";

export function ApplicationReview({
  record,
  catalog,
}: {
  record: DemoMemberRecord;
  catalog: readonly ApplicationCategory[];
}) {
  const profile = record.profile;
  return (
    <>
      <section className="panel">
        <h2>Application details</h2>
        <dl className="admin-details">
          <div>
            <dt>Applicant</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt>Contact email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div>
            <dt>Phone / website</dt>
            <dd>
              {profile.phone || "No phone supplied"}
              <br />
              {profile.website || "No website supplied"}
            </dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>
              {profile.city}, {profile.state}
            </dd>
          </div>
          <div>
            <dt>Categories</dt>
            <dd>
              {catalog
                .filter((item) => profile.categoryIds.includes(item.id))
                .map((item) => item.name)
                .join(" · ")}
            </dd>
          </div>
          <div>
            <dt>Services</dt>
            <dd>{profile.services.join(" · ")}</dd>
          </div>
          <div>
            <dt>Description</dt>
            <dd>{profile.description}</dd>
          </div>
          <div>
            <dt>Healthy-home practices</dt>
            <dd>{profile.practices}</dd>
          </div>
          <div>
            <dt>Listed credentials</dt>
            <dd>
              {record.credentials.map((claim) => claim.text).join(" · ") ||
                "None supplied"}
            </dd>
          </div>
        </dl>
        <p className="field-help">
          Application contact details are shown for review only.
        </p>
      </section>
      <DecisionForm record={record} purpose="application" />
    </>
  );
}
