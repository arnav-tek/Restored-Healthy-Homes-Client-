"use client";
import { useEffect, useRef } from "react";
import { CircleCheck, CircleAlert, CreditCard, XCircle } from "lucide-react";
import { formatMonthlyPrice } from "@/domain/categories";
import { canStartBilling, type BillingDemoKind } from "@/domain/billing-demo";
import type { DemoMemberRecord } from "@/domain/demo-member";
import { isPubliclyEligible } from "@/domain/listing";
import { useDemoDraft, useDemoSession } from "./demo-session";
import type { ApplicationCategory } from "./profile-fields-form";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { Button } from "@/components/ui/button";
import { ApplicationPublication } from "@/features/profiles/application-publication";

export function BillingDemo({
  record,
  catalog,
  disabled = false,
}: {
  record: DemoMemberRecord;
  catalog: readonly ApplicationCategory[];
  disabled?: boolean;
}) {
  const { state, dispatch } = useDemoSession();
  const { draft, saveDraft } = useDemoDraft(`billing-category:${record.id}`);
  const ready = useDemoReady();
  const heading = useRef<HTMLHeadingElement>(null);
  const attempt = state.billing.find(({ memberId }) => memberId === record.id);
  const choices = catalog.filter(({ id }) =>
    record.profile.categoryIds.includes(id),
  );
  const category =
    choices.find(
      ({ id }) => id === (attempt?.categoryId ?? draft?.categoryId),
    ) ?? choices[0];
  const reviewing =
    !!attempt &&
    ["checkout", "recovery", "cancel-confirmation"].includes(attempt.stage);
  const blocked = disabled || !ready || !category;
  useEffect(() => {
    if (attempt) heading.current?.focus();
  }, [attempt]);
  function start(kind: BillingDemoKind) {
    if (!blocked && category)
      dispatch({
        type: "billing-start",
        id: record.id,
        categoryId: category.id,
        kind,
      });
  }
  const titles = {
    checkout:
      attempt?.kind === "renewal"
        ? "Review a simulated renewal"
        : "Review simulated checkout",
    recovery: "Recover your demo membership",
    failed: "Simulated payment failed",
    active: "Simulated membership active",
    "cancel-confirmation": "Cancel this demo membership?",
    canceled: "Simulated membership canceled",
  };
  const StageIcon =
    attempt?.stage === "active"
      ? CircleCheck
      : attempt?.stage === "failed"
        ? CircleAlert
        : attempt?.stage === "canceled"
          ? XCircle
          : CreditCard;
  return (
    <div
      className="admin-management-stack billing-demo"
      data-testid="billing-demo"
    >
      <section
        className="panel admin-detail-card"
        aria-labelledby="billing-heading"
      >
        <p className="section-tag">Membership walkthrough</p>
        <h2 id="billing-heading" className="admin-detail-heading">
          Subscription
        </h2>
        <p>
          Simulated status:{" "}
          <strong data-testid="billing-status">{record.subscription}</strong>.
          Approval alone does not make a listing public.
        </p>
        <p className="workspace-note">
          Demonstration only. No card details, payment service or real charges.
          Changes stay in this tab and clear on refresh or reset.
        </p>
        <div className="rate-list">
          {choices.map((item) => (
            <div key={item.id} className="rate-item">
              <span>{item.name}</span>
              <strong>
                {formatMonthlyPrice(item.monthlyUsd)}
                <span> / month</span>
                {item.previewPrice && <small> · preview</small>}
              </strong>
            </div>
          ))}
        </div>
        <p className="field-help">
          Individual-category prices in USD. Multi-category pricing is pending
          confirmation. Choose one category for this example; it does not set a
          combined bill or change your listed specialties.
        </p>
        {!reviewing && (
          <fieldset className="member-form-fields" disabled={blocked}>
            <legend className="sr-only">Choose a billing demonstration</legend>
            <div className="search-field">
              <label htmlFor="billing-category">Example category</label>
              <select
                id="billing-category"
                value={category?.id ?? ""}
                onChange={(event) => {
                  if (attempt)
                    dispatch({ type: "billing-close", id: record.id });
                  saveDraft({ categoryId: event.target.value });
                }}
              >
                {choices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.previewPrice ? " (preview)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-inline-actions billing-actions">
              {canStartBilling("checkout", record.subscription) && (
                <Button type="button" onClick={() => start("checkout")}>
                  Start simulated checkout
                </Button>
              )}
              {canStartBilling("renewal", record.subscription) && (
                <Button type="button" onClick={() => start("renewal")}>
                  Try a renewal scenario
                </Button>
              )}
              {canStartBilling("recovery", record.subscription) && (
                <Button type="button" onClick={() => start("recovery")}>
                  Review recovery
                </Button>
              )}
              {canStartBilling("cancel", record.subscription) && (
                <Button
                  className="button-secondary"
                  type="button"
                  onClick={() => start("cancel")}
                >
                  Review cancellation
                </Button>
              )}
            </div>
          </fieldset>
        )}
        {!choices.length && (
          <p role="status">
            Add a specialty to your profile before trying a billing example.
          </p>
        )}
      </section>
      {attempt && (
        <section
          className={`panel admin-detail-card billing-stage billing-stage-${attempt.stage}`}
          aria-labelledby="billing-stage-heading"
          data-testid="billing-stage"
        >
          <div className="billing-stage-intro">
            <StageIcon size={25} aria-hidden="true" />
            <div>
              <p className="section-tag">
                {attempt.kind === "cancel"
                  ? "Cancellation"
                  : attempt.kind === "recovery"
                    ? "Payment recovery"
                    : "Checkout"}{" "}
                demonstration
              </p>
              <h2
                ref={heading}
                id="billing-stage-heading"
                className="admin-detail-heading"
                tabIndex={-1}
              >
                {titles[attempt.stage]}
              </h2>
            </div>
          </div>
          <dl className="billing-summary">
            <div>
              <dt>Example category</dt>
              <dd>
                {category?.name ?? "Category unavailable"}
                {category?.previewPrice ? " · preview price" : ""}
              </dd>
            </div>
            <div>
              <dt>Monthly reference</dt>
              <dd>{formatMonthlyPrice(attempt.monthlyUsd)} USD / month</dd>
            </div>
            <div>
              <dt>Charged in this demo</dt>
              <dd>$0</dd>
            </div>
          </dl>
          {attempt.stage === "checkout" || attempt.stage === "recovery" ? (
            <>
              <p>
                {attempt.stage === "recovery"
                  ? "Choose a recovery result. Success restores active membership; another failure keeps it past due."
                  : "Choose a payment result to continue the walkthrough. Success sets membership to active; failure sets it to past due."}{" "}
                No payment is attempted.
              </p>
              <fieldset
                disabled={blocked}
                className="billing-actions admin-inline-actions"
              >
                <legend className="sr-only">Simulated payment result</legend>
                <Button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "billing-result",
                      id: record.id,
                      attemptId: attempt.attemptId,
                      outcome: "success",
                    })
                  }
                >
                  Simulate successful payment
                </Button>
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    dispatch({
                      type: "billing-result",
                      id: record.id,
                      attemptId: attempt.attemptId,
                      outcome: "failure",
                    })
                  }
                >
                  Simulate failed payment
                </Button>
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    dispatch({ type: "billing-close", id: record.id })
                  }
                >
                  {attempt.stage === "recovery"
                    ? "Leave recovery"
                    : "Leave checkout"}
                </Button>
              </fieldset>
            </>
          ) : attempt.stage === "cancel-confirmation" ? (
            <>
              <p>
                Confirming sets this tab&apos;s membership to canceled
                immediately and removes any eligible submitted listing and
                linked homepage feature. Approval, credential review, suspension
                and featured entitlement are retained. Real cancellation timing,
                refunds and billing policies still need approval.
              </p>
              <fieldset
                disabled={blocked}
                className="billing-actions admin-inline-actions"
              >
                <legend className="sr-only">
                  Confirm simulated cancellation
                </legend>
                <Button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "billing-cancel",
                      id: record.id,
                      attemptId: attempt.attemptId,
                    })
                  }
                >
                  Confirm simulated cancellation
                </Button>
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={() =>
                    dispatch({ type: "billing-close", id: record.id })
                  }
                >
                  Keep current status
                </Button>
              </fieldset>
            </>
          ) : (
            <p role="status">
              {attempt.stage === "active"
                ? "Payment success was simulated. No money was collected."
                : attempt.stage === "failed"
                  ? "No payment was attempted. Try Review recovery above to demonstrate a retry, or review cancellation."
                  : "Cancellation was simulated. No real subscription or refund exists. Start another checkout above to demonstrate returning."}
            </p>
          )}
          <p className="field-help">
            {isPubliclyEligible(record)
              ? "This record meets the approval, membership and suspension requirements. Only linked public examples and submitted applications can appear on public pages."
              : "This record is not eligible for publication. Active membership cannot approve an application or remove a suspension."}{" "}
            Credential verification and featured entitlement are separate.
          </p>
        </section>
      )}
      <ApplicationPublication memberId={record.id} />
    </div>
  );
}
