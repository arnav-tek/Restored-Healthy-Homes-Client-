"use client";
import "./connected-consultations.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { consultationStatusLabels } from "@/domain/consultation";
import type { ConsultationReceipt } from "@/domain/connected-consultations";
import { useDemoReady } from "@/components/ui/use-demo-ready";
export function ConnectedConsultationRequest({
  categories,
}: {
  categories: readonly { id: string; name: string }[];
}) {
  const ready = useDemoReady();
  const [receipt, setReceipt] = useState<ConsultationReceipt | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const retry = useRef<{
    requestId: string;
    token: string;
    content: string;
  } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  async function refresh(initial = false) {
    try {
      const r = await fetch("/api/consultations", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) {
        setReceipt(d);
        setConfirm(false);
        setMessage("");
      } else if (!initial || r.status !== 404) setMessage(d.error);
    } catch {
      if (!initial)
        setMessage("Saved status could not be loaded. Please retry.");
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/consultations", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!controller.signal.aborted) {
          if (response.ok) setReceipt(data);
          else if (response.status !== 404) setMessage(data.error);
        }
      })
      .catch(() => {
        /* A missing initial receipt never prevents a new request. */
      });
    return () => controller.abort();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || busy) return;
    const form = e.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const content = JSON.stringify(fields);
    if (!retry.current || retry.current.content !== content) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      retry.current = {
        content,
        requestId: crypto.randomUUID(),
        token: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
          "",
        ),
      };
    }
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          requestId: retry.current.requestId,
          token: retry.current.token,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMessage(d.error);
        return;
      }
      await refresh();
      form.reset();
      retry.current = null;
      requestAnimationFrame(() => heading.current?.focus());
    } catch {
      setMessage(
        "Saving could not be confirmed. Your draft is retained; retry the same request.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!receipt) return;
    setBusy(true);
    try {
      const r = await fetch("/api/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: receipt.requestId,
          version: receipt.version,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setReceipt(d);
        setConfirm(false);
        setMessage("Request cancelled.");
      } else setMessage(d.error);
    } catch {
      setMessage(
        "Cancellation could not be confirmed. Refresh status before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="request"
      className="consultation-request panel connected-consultations"
    >
      <h2 ref={heading} tabIndex={-1}>
        Request a free phone consultation
      </h2>
      <p>
        Admin coordinates requests by email. Timing is agreed separately;
        submitting or accepting a request does not book a call. Automatic email
        notifications are not enabled yet.
      </p>
      <p>
        Your name and email are visible to the administrator. Specialists see
        your category and topic only. Do not include medical records, addresses
        or other private details in your topic.
      </p>
      {message && <p role="alert">{message}</p>}
      {receipt && (
        <section className="panel" aria-label="Latest saved request">
          <h3>Your latest saved request</h3>
          <p role="status">{consultationStatusLabels[receipt.status]}</p>
          <p>
            This browser can check this request for 30 days. Clearing cookies or
            switching browsers removes receipt access. Contact the site
            administrator if you need help.
          </p>
          <div className="admin-inline-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh status
            </button>
            {receipt.status !== "cancelled" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                Cancel request
              </button>
            )}
          </div>
          {confirm && (
            <div role="group" aria-label="Confirm cancellation">
              <p>Cancel this consultation request?</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void cancel()}
              >
                Yes, cancel request
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Keep request
              </button>
            </div>
          )}
        </section>
      )}
      <noscript>
        JavaScript is required to send a consultation request securely. No
        request can be sent from this form without it.
      </noscript>
      <form
        method="post"
        action="/api/consultations"
        onSubmit={submit}
        className="consultation-form"
      >
        <fieldset disabled={!ready || busy}>
          <legend>{receipt ? "Send another request" : "Your request"}</legend>
          <div className="consultation-field-pair">
            <label>
              Your name
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
          </div>
          <label>
            Professional category
            <select name="categoryId" required defaultValue="">
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="format" value="phone" />
          <label>
            What would you like to discuss?
            <textarea
              name="topic"
              required
              minLength={20}
              maxLength={2000}
              rows={5}
            />
          </label>
          {receipt && (
            <p>
              A new request replaces the status receipt in this browser; your
              previous request remains saved.
            </p>
          )}
          <button
            className="button"
            disabled={!ready || busy || !categories.length}
          >
            {busy ? "Saving…" : "Send request"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
