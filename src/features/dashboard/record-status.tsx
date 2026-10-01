import type { DemoMemberRecord } from "@/domain/demo-member";
import { isPubliclyEligible } from "@/domain/listing";
export function RecordStatus({ record }: { record: DemoMemberRecord }) {
  return (
    <dl className="workspace-status">
      <div>
        <dt>Application</dt>
        <dd data-testid="member-approval">
          <span
            data-testid="admin-approval"
            className={`status-badge ${record.approval === "approved" ? "visible" : ""}`}
          >
            {record.approval}
          </span>
        </dd>
      </div>
      <div>
        <dt>Subscription</dt>
        <dd>{record.subscription} (sample)</dd>
      </div>
      <div>
        <dt>Suspension</dt>
        <dd>{record.suspended ? "Suspended" : "None"}</dd>
      </div>
      <div>
        <dt>Eligibility</dt>
        <dd>
          {isPubliclyEligible(record)
            ? "Meets sample eligibility rules"
            : "Not eligible"}
        </dd>
      </div>
    </dl>
  );
}
