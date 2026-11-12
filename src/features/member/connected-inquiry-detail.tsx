"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { InboxDetail } from "@/domain/inbox";
import { isRecord } from "@/validation/member-account";
import { inquiryDate } from "./inquiry-date";

export function ConnectedInquiryDetail({ initial }: { initial: InboxDetail }) {
  const [detail, setDetail] = useState(initial);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  async function changeState() {
    if (pending) return;
    setPending(true);
    setFailure("");
    setNotice("");
    try {
      const response = await fetch("/api/member/inquiries", {
        method: "PATCH",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: detail.id,
          read: !detail.readAt,
          version: detail.version,
        }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        !isRecord(result) ||
        result.id !== detail.id ||
        !Number.isSafeInteger(result.version) ||
        !(
          result.readAt === null ||
          (typeof result.readAt === "string" &&
            Number.isFinite(Date.parse(result.readAt)))
        )
      ) {
        setFailure(
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "The read state could not be saved. Please reload and try again.",
        );
        return;
      }
      setDetail({
        ...detail,
        readAt: result.readAt,
        version: Number(result.version),
      });
      setNotice(result.readAt ? "Marked as read." : "Marked as unread.");
    } catch {
      setFailure(
        "The read state could not be confirmed. Please reload before trying again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="connected-inquiry-detail min-w-0 [overflow-wrap:anywhere]">
      <h2>Inquiry from {detail.name}</h2>
      <p>
        <strong>Received:</strong>{" "}
        <time dateTime={detail.createdAt}>{inquiryDate(detail.createdAt)}</time>
      </p>
      <p>
        <strong>Sender email:</strong> {detail.email}
      </p>
      <p>
        <strong>Status:</strong> {detail.readAt ? "Read" : "Unread"}
      </p>
      {detail.readAt && (
        <p className="field-help">
          Read{" "}
          <time dateTime={detail.readAt}>{inquiryDate(detail.readAt)}</time>
        </p>
      )}
      <p className="inbox-message whitespace-pre-wrap [overflow-wrap:anywhere]">
        {detail.message}
      </p>
      <p className="field-help">
        Saved messages remain here independently of email notifications. Replies
        are not available from this page.
      </p>
      {failure && (
        <div role="alert">
          <p className="field-error">{failure}</p>
          <Button type="button" onClick={() => window.location.reload()}>
            Reload inquiry
          </Button>
        </div>
      )}
      <p role="status" aria-live="polite">
        {notice}
      </p>
      <Button type="button" disabled={pending} onClick={changeState}>
        {pending
          ? "Saving read state…"
          : detail.readAt
            ? "Mark as unread"
            : "Mark as read"}
      </Button>
    </article>
  );
}
