import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { applicationMode } from "../../domain/config";
import { preventSharedCaching } from "../supabase/cache";
import { createNotificationQueue } from "../supabase/inquiry-notifications";
import { authConfiguration } from "../supabase/auth-config";
import {
  authorizedNotificationWorker,
  configuredInquiryEmailAdapter,
} from "./config";
import { dispatchInquiryNotifications } from "./dispatcher";
import {
  trustedNotificationOrigin,
  validNotificationAddress,
} from "./template";

export async function handleNotificationWorker(request: NextRequest) {
  const json = (body: unknown, status: number) => {
    const response = NextResponse.json(body, { status });
    preventSharedCaching(response.headers);
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  if (applicationMode(process.env) !== "staging")
    return json({ error: "Not available in demo mode." }, 404);
  if (
    !authorizedNotificationWorker(
      request.headers.get("authorization"),
      process.env.RHH_INQUIRY_WORKER_SECRET,
    )
  )
    return json({ error: "Worker authorization required." }, 401);
  if (request.nextUrl.search)
    return json(
      { error: "Worker requests do not accept routing or job input." },
      400,
    );
  try {
    // Node may expose a stream even for Content-Length: 0. Accept an empty
    // stream while rejecting the first actual input byte without buffering it.
    const reader = request.body?.getReader();
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.length) {
          await reader.cancel();
          return json(
            { error: "Worker requests do not accept routing or job input." },
            400,
          );
        }
      }
    const adapter = configuredInquiryEmailAdapter();
    if (!adapter || adapter.mode !== "live")
      return json(
        {
          error:
            "Inquiry email delivery is paused pending provider and sender configuration.",
        },
        503,
      );
    const sender = process.env.RHH_INQUIRY_EMAIL_FROM ?? "";
    if (!validNotificationAddress(sender))
      return json({ error: "Verified sender configuration is required." }, 503);
    const origin = trustedNotificationOrigin(authConfiguration().origin);
    const counts = await dispatchInquiryNotifications(
      createNotificationQueue(),
      adapter,
      { sender, origin },
    );
    return json({ completed: true, counts }, 200);
  } catch {
    return json(
      {
        error:
          "Notification dispatch is unavailable. Job state will be checked on the next authorized run.",
      },
      503,
    );
  }
}
