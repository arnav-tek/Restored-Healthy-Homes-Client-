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
      <section className="panel admin-detail-card">
        <h2 className="admin-detail-heading">Application details</h2>
        <dl className="admin-details-grid">
          <div className="admin-detail-item">
            <dt>Applicant</dt>
            <dd>{profile.name}</dd>
          </div>
          <div className="admin-detail-item">
            <dt>Contact email</dt>
            <dd>{profile.email}</dd>
          </div>
          <div className="admin-detail-item">
            <dt>Phone / website</dt>
            <dd>
              {profile.phone || "No phone supplied"}
              <br />
              {profile.website || "No website supplied"}
            </dd>
          </div>
          <div className="admin-detail-item">
            <dt>Location</dt>
            <dd>
              {profile.city}, {profile.state}
            </dd>
          </div>
          <div className="admin-detail-item admin-detail-wide">
            <dt>Categories</dt>
            <dd>
              {catalog
                .filter((item) => profile.categoryIds.includes(item.id))
                .map((item) => item.name)
                .join(" · ") || "None selected"}
            </dd>
          </div>
          <div className="admin-detail-item admin-detail-wide">
            <dt>Services</dt>
            <dd>{profile.services.join(" · ") || "None supplied"}</dd>
          </div>
          <div className="admin-detail-item admin-detail-wide">
            <dt>Description</dt>
            <dd>{profile.description}</dd>
          </div>
          <div className="admin-detail-item admin-detail-wide">
            <dt>Healthy-home practices</dt>
            <dd>{profile.practices}</dd>
          </div>
          <div className="admin-detail-item admin-detail-wide">
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
