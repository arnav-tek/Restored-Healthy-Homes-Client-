"use client";
import { memberFormFields, type DemoMemberRecord } from "@/domain/demo-member";
import {
  ProfileFieldsForm,
  type ApplicationCategory,
} from "@/features/member/profile-fields-form";
import { useDemoSession } from "@/features/member/demo-session";

export function ListingEditor({
  record,
  catalog,
}: {
  record: DemoMemberRecord;
  catalog: readonly ApplicationCategory[];
}) {
  const { dispatch } = useDemoSession();
  return (
    <details className="panel admin-listing-editor">
      <summary>Edit business profile</summary>
      <p className="field-help">
        Changes appear in the member workspace and directory overview in this
        tab. Approval, membership and credential review remain separate.
      </p>
      <ProfileFieldsForm
        key={record.id}
        catalog={catalog}
        initial={memberFormFields(record)}
        draftKey={`admin-profile:${record.id}`}
        submitLabel="Save profile changes"
        onValid={(profile) =>
          dispatch({ type: "edit", id: record.id, profile })
        }
      />
    </details>
  );
}
