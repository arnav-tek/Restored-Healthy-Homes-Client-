import { test } from "node:test";
import assert from "node:assert/strict";
import { demoDirectory } from "../../src/data/demo/repository";
import { demoQaRepository } from "../../src/data/demo/qa-repository";
import { demoReviewRepository } from "../../src/data/demo/review-repository";
import { getDemoSessionSeed } from "../../src/data/demo/member-session";
import {
  createDemoSession,
  reduceDemoSession,
  memberFormFields,
  type DemoMemberAction,
} from "../../src/domain/demo-member";
import {
  eligiblePublicIds,
  publicSessionProfiles,
  publicSessionProfessionals,
} from "../../src/domain/public-session";
import { publicFeaturedExamples } from "../../src/domain/public-featured";
import { publicDirectoryCatalog } from "../../src/domain/public-application";
import { publicSessionQuestions } from "../../src/domain/qa-session";
import {
  memberReviewView,
  publicSessionReviews,
} from "../../src/domain/review-session";
import { ownInquiries } from "../../src/domain/inquiry-session";
import { homeStatistics } from "../../src/domain/home-statistics";
import { categories } from "../../src/domain/categories";
import { canCoordinate } from "../../src/domain/consultation-session";

async function session() {
  const seed = getDemoSessionSeed();
  const [profiles, qa, reviews] = await Promise.all([
    demoDirectory.listPublicProfiles(),
    demoQaRepository.listPublic(),
    demoReviewRepository.publicSnapshot(),
  ]);
  let state = createDemoSession(
    seed,
    qa,
    profiles.map(({ id }) => id),
    reviews,
    profiles,
  );
  const act = (action: DemoMemberAction) => {
    state = reduceDemoSession(state, action, seed);
  };
  const signIn = (account: string) => {
    if (state.identity) act({ type: "demo-sign-out" });
    act({
      type: "demo-sign-in",
      fields: { email: `${account}@example.invalid`, passcode: "home-access" },
    });
  };
  return {
    get state() {
      return state;
    },
    seed,
    profiles,
    act,
    signIn,
  };
}
const fernId = "demo-mold-inspection",
  fernMember = "member-example-fern";
const image = {
  dataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  width: 1,
  height: 1,
};

test("Q&A attribution follows accepted public names and unavailable public data removes all profile links", async () => {
  const demo = await session();
  demo.signIn("fern");
  const question = publicSessionQuestions(demo.state).find((item) => item.categoryId === "mold-inspection")!;
  demo.act({ type: "submit-answer", questionId: question.id, body: "A fictional response with an explicit professional association." });
  const id = demo.state.qa.answers[0].id;
  demo.signIn("admin");
  demo.act({ type: "moderate-answer", id, status: "published", note: "" });
  demo.signIn("fern");
  const record = demo.state.records.find((item) => item.id === fernMember)!;
  demo.act({ type: "edit", id: fernMember, profile: { ...memberFormFields(record), businessName: "Renamed public specialist" } });
  const answer = publicSessionQuestions(demo.state).flatMap((item) => item.answers).find((item) => item.id === id)!;
  assert.equal(answer.attribution, "Renamed public specialist");
  assert.equal(answer.profileHref, `/professionals/${fernId}`);
  assert.equal(publicSessionQuestions({ ...demo.state, publicProfiles: [] }).flatMap((item) => item.answers).every((item) => !item.profileHref), true);
});

test("linked eligibility removes every public surface while unrelated examples survive; recovery cannot clear suspension/rejection", async () => {
  const demo = await session();
  const ids = () => eligiblePublicIds(demo.state);
  const featured = () =>
    publicFeaturedExamples(
      publicSessionProfessionals(demo.state),
      [fernId, "demo-healthy-designers"],
      demo.state,
    );
  assert.equal(ids().length, 8);
  assert.equal(
    featured().some(({ id }) => id === fernId),
    true,
  );
  demo.signIn("admin");
  demo.act({
    type: "suspend",
    id: fernMember,
    suspended: true,
    reason: "PRIVATE_SUSPENSION",
  });
  assert.equal(ids().includes(fernId), false);
  assert.equal(
    publicSessionProfiles(demo.state).some(({ id }) => id === fernId),
    false,
  );
  assert.equal(
    featured().some(({ id }) => id === fernId),
    false,
  );
  assert.equal(
    homeStatistics(publicSessionProfiles(demo.state), demo.state.reviews, ids())
      .professionals,
    7,
  );
  assert.deepEqual(publicSessionReviews(demo.state.reviews, ids(), fernId), []);
  assert.equal(
    publicSessionQuestions(demo.state)
      .flatMap((question) => question.answers)
      .some((answer) => answer.profileHref?.endsWith(fernId)),
    false,
  );
  demo.act({
    type: "simulate-membership",
    id: fernMember,
    status: "past_due",
    reason: "Sample failure",
  });
  demo.act({
    type: "simulate-membership",
    id: fernMember,
    status: "active",
    reason: "Sample recovery",
  });
  assert.equal(ids().includes(fernId), false);
  assert.equal(ids().includes("demo-healthy-designers"), true);
  demo.act({
    type: "suspend",
    id: fernMember,
    suspended: false,
    reason: "Review complete",
  });
  assert.equal(ids().includes(fernId), true);
  demo.act({
    type: "decide",
    id: fernMember,
    approval: "rejected",
    reason: "Review decision",
  });
  demo.act({
    type: "simulate-membership",
    id: fernMember,
    status: "active",
    reason: "Payment recovered",
  });
  assert.equal(ids().includes(fernId), false);
});

test("accepted profile, credential and participation changes share a public allowlist; category labels preserve prices and IDs", async () => {
  const demo = await session();
  demo.signIn("fern");
  const member = demo.state.records.find(({ id }) => id === fernMember)!;
  assert.deepEqual(
    publicSessionProfiles(demo.state).find(({ id }) => id === fernId)
      ?.verifiedCredentials,
    ["Training record"],
  );
  demo.act({
    type: "edit",
    id: fernMember,
    profile: {
      ...memberFormFields(member),
      businessName: "Accepted Studio",
      name: "PRIVATE_OWNER",
      email: "private-owner@example.invalid",
      publicDisplayName: "Approved public name",
      publicEmail: "public@example.invalid",
      description: "An accepted description for this synthetic business.",
      listedCredentials: ["Changed training claim"],
    },
  });
  demo.act({ type: "set-free-consultation", id: fernMember, enabled: false });
  const profile = publicSessionProfiles(demo.state).find(
    ({ id }) => id === fernId,
  )!;
  assert.equal(profile.businessName, "Accepted Studio");
  assert.deepEqual(profile.verifiedCredentials, []);
  assert.deepEqual(profile.listedCredentials, ["Changed training claim"]);
  assert.equal(profile.freeConsultation, false);
  assert.equal(
    canCoordinate(
      demo.state.records.find(({ id }) => id === fernMember),
      "mold-inspection",
    ),
    false,
  );
  assert.equal(profile.contact.email, "public@example.invalid");
  assert.doesNotMatch(
    JSON.stringify(publicSessionProfessionals(demo.state)),
    /PRIVATE_OWNER|private-owner|public@example.invalid|decisionReason|billing|inquiries/,
  );
  demo.signIn("admin");
  demo.act({
    type: "rename-category",
    id: "mold-inspection",
    name: "Accepted specialty name",
  });
  demo.act({
    type: "create-category",
    fields: {
      name: "Added specialty",
      description: "A provisional category for this demo.",
      monthlyUsd: 123,
    },
  });
  const catalog = publicDirectoryCatalog(categories, demo.state);
  assert.equal(catalog[0].name, "Accepted specialty name");
  assert.equal(catalog[0].monthlyUsd, categories[0].monthlyUsd);
  assert.equal(catalog[0].billingKey, categories[0].billingKey);
  assert.equal(catalog.at(-1)?.monthlyUsd, 123);
  assert.deepEqual(profile.categoryIds, ["mold-inspection"]);
});

test("a published application participates once in counts, featured, reviews, member ownership and moderated Q&A attribution", async () => {
  const demo = await session();
  demo.act({
    type: "submit",
    profile: {
      ...memberFormFields(demo.seed.records[0]),
      categoryIds: ["mold-inspection"],
      businessName: "New Connected Studio",
      state: "VT",
    },
  });
  const id = demo.state.applicationId!;
  demo.signIn("admin");
  demo.act({
    type: "decide",
    id,
    approval: "approved",
    reason: "Application reviewed",
  });
  demo.act({
    type: "simulate-membership",
    id,
    status: "active",
    reason: "Membership scenario",
  });
  demo.act({
    type: "set-featured",
    id,
    enabled: true,
    reason: "Featured example",
  });
  const professionals = publicSessionProfessionals(demo.state);
  assert.equal(professionals.length, 9);
  assert.equal(professionals.filter((item) => item.id === id).length, 1);
  assert.equal(
    homeStatistics(
      publicSessionProfiles(demo.state),
      demo.state.reviews,
      eligiblePublicIds(demo.state),
    ).states,
    8,
  );
  assert.equal(
    publicFeaturedExamples(professionals, [], demo.state).some(
      (item) => item.id === id,
    ),
    true,
  );
  demo.act({
    type: "submit-review",
    professionalId: id,
    fields: {
      displayName: "Fictional visitor",
      rating: 5,
      body: "A fictional review for a connected application example.",
    },
  });
  const reviewId = demo.state.reviews.submissions[0].id;
  demo.act({
    type: "moderate-review",
    id: reviewId,
    status: "published",
    note: "PRIVATE_REVIEW_NOTE",
  });
  demo.signIn("application");
  assert.equal(memberReviewView(demo.state).professionalId, id);
  assert.equal(memberReviewView(demo.state).reviews.length, 1);
  const question = publicSessionQuestions(demo.state).find(
    (item) => item.categoryId === "mold-inspection",
  )!;
  demo.act({
    type: "submit-answer",
    questionId: question.id,
    body: "This fictional professional would discuss a clear sample scope.",
  });
  const answerId = demo.state.qa.answers[0].id;
  assert.equal(
    publicSessionQuestions(demo.state)
      .flatMap((item) => item.answers)
      .some((answer) => answer.id === answerId),
    false,
  );
  demo.signIn("admin");
  demo.act({
    type: "moderate-answer",
    id: answerId,
    status: "published",
    note: "PRIVATE_ANSWER_NOTE",
  });
  const answer = publicSessionQuestions(demo.state)
    .flatMap((item) => item.answers)
    .find((item) => item.id === answerId)!;
  assert.equal(answer.profileHref, `/professionals/${id}`);
  assert.doesNotMatch(JSON.stringify(answer), /PRIVATE_ANSWER_NOTE|authorId/);
});

test("inquiries derive the correct private recipient, reject duplicates/unlinked/unavailable targets and survive switching only", async () => {
  const demo = await session();
  const fields = {
    name: "Fictional sender",
    email: "private-inquiry@example.invalid",
    message: "A fictional inquiry for the intended professional only.",
  };
  demo.act({ type: "submit-inquiry", professionalId: fernId, fields });
  demo.act({ type: "submit-inquiry", professionalId: fernId, fields });
  assert.equal(
    demo.state.inquiries.filter((item) => item.professionalId === fernId)
      .length,
    1,
  );
  demo.act({
    type: "submit-inquiry",
    professionalId: "demo-healthy-designers",
    fields,
  });
  assert.equal(demo.state.inquiries.length, demo.seed.inquiries.length + 1);
  demo.signIn("approved");
  assert.equal(
    ownInquiries(demo.state).some((item) => item.sender.includes(fields.email)),
    false,
  );
  demo.signIn("fern");
  assert.equal(ownInquiries(demo.state).length, 1);
  assert.match(ownInquiries(demo.state)[0].sender, /private-inquiry/);
  assert.doesNotMatch(
    JSON.stringify(publicSessionProfiles(demo.state)),
    /private-inquiry|Fictional sender/,
  );
  demo.signIn("admin");
  demo.act({
    type: "suspend",
    id: fernMember,
    suspended: true,
    reason: "Sample suspension",
  });
  demo.act({ type: "new-inquiry", professionalId: fernId });
  demo.act({ type: "submit-inquiry", professionalId: fernId, fields });
  assert.equal(demo.state.inquiries.length, demo.seed.inquiries.length + 1);
  demo.act({ type: "reset" });
  assert.deepEqual(demo.state.inquiries, demo.seed.inquiries);
  assert.deepEqual(demo.state.currentInquiryByProfessional, {});
});

test("accepted photos enforce owner/type/signature/dimension bounds, persist across accounts, and clear on reset", async () => {
  const demo = await session();
  demo.signIn("fern");
  demo.act({
    type: "save-profile-photo",
    id: "member-example-builder",
    photo: image,
  });
  assert.deepEqual(demo.state.photos, {});
  for (const photo of [
    { ...image, height: 4097 },
    { ...image, dataUrl: "data:image/svg+xml;base64,PHN2Zy8+" },
    { ...image, dataUrl: "data:image/png;base64,YWJj" },
  ]) {
    demo.act({ type: "save-profile-photo", id: fernMember, photo });
    assert.deepEqual(demo.state.photos, {});
  }
  demo.act({ type: "save-profile-photo", id: fernMember, photo: image });
  demo.signIn("builder");
  assert.deepEqual(demo.state.photos[fernMember], image);
  assert.equal(demo.state.photos["member-example-builder"], undefined);
  demo.act({ type: "save-profile-photo", id: fernMember, photo: null });
  assert.deepEqual(demo.state.photos[fernMember], image);
  demo.signIn("fern");
  demo.act({ type: "save-profile-photo", id: fernMember, photo: null });
  assert.deepEqual(demo.state.photos, {});
  demo.act({ type: "save-profile-photo", id: fernMember, photo: image });
  demo.act({ type: "reset" });
  assert.deepEqual(demo.state.photos, {});
  assert.equal(eligiblePublicIds(demo.state).length, 8);
});
