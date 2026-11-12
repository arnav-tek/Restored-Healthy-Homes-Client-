"use client";
import type { ComponentProps } from "react";
import { ProfileFieldsEditor } from "./profile-fields-editor";
import { useDemoDraft } from "./demo-session";
export type { ApplicationCategory } from "./profile-fields-editor";

/** Demo draft ownership stays in the demo provider; connected forms do not mount it. */
export function ProfileFieldsForm({
  draftKey = "application",
  ...props
}: Omit<
  ComponentProps<typeof ProfileFieldsEditor>,
  "draft" | "saveDraft" | "clearDraft"
> & { draftKey?: string }) {
  const draft = useDemoDraft(draftKey);
  return <ProfileFieldsEditor {...props} {...draft} />;
}
