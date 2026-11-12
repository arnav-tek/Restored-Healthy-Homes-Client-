import "server-only";
import { inquiryUuid } from "../../validation/connected-inquiry";
import type { PreparedNotification } from "../../domain/inquiry-notification";
import type { NotificationMessage } from "./contracts";

export function escapeNotificationHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}
export function trustedNotificationOrigin(value: string) {
  const url = new URL(value);
  if (
    url.origin !== value ||
    value.length > 256 ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !["http://127.0.0.1:3230", "http://localhost:3230"].includes(value))
  )
    throw new Error(
      "Configure a trusted application origin for inquiry email links.",
    );
  return value;
}
export function validNotificationAddress(value: string) {
  return (
    value.length <= 254 &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) &&
    !/[\r\n\x00]/.test(value)
  );
}
/** Version 1 contains no sender, project, message body or other user-supplied text. */
export function inquiryNotificationMessage(
  prepared: PreparedNotification,
): NotificationMessage {
  if (
    !inquiryUuid.test(prepared.inquiryId) ||
    !validNotificationAddress(prepared.to) ||
    !validNotificationAddress(prepared.from)
  )
    throw new Error("Invalid protected notification routing.");
  const link = `${trustedNotificationOrigin(prepared.origin)}/member/inquiries/${prepared.inquiryId}`;
  const safeLink = escapeNotificationHtml(link);
  return {
    to: prepared.to,
    from: prepared.from,
    idempotencyKey: prepared.idempotencyKey,
    subject: "A new inquiry is in your Restored Healthy Homes inbox",
    text: `Restored Healthy Homes\n\nA new inquiry has been saved to your member inbox. Sign in to read it:\n${link}\n\nYour saved inbox is the record of this inquiry. This notification does not contain the sender’s message.`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New inquiry</title></head><body style="margin:0;background:#f5f1e9;color:#30271d;font-family:Arial,sans-serif;line-height:1.6"><main style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border:1px solid #dedfd4;border-radius:12px;overflow-wrap:anywhere"><p style="color:#3e5b3c;font-weight:bold">Restored Healthy Homes</p><h1 style="font-family:Georgia,serif;font-size:28px">A new inquiry is waiting</h1><p>A new inquiry has been saved to your member inbox. Sign in to read it.</p><p><a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#3e5b3c;color:#fff;border-radius:6px;text-decoration:underline">Open your member inbox</a></p><p style="font-size:14px">Your saved inbox is the record of this inquiry. This notification does not contain the sender’s message.</p><p style="font-size:14px">If the button does not open, use this link:<br><a href="${safeLink}">${safeLink}</a></p></main></body></html>`,
  };
}
