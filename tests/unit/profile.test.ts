import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "../../src/domain/categories";
import {
  findPublicProfile,
  isPubliclyEligible,
} from "../../src/domain/listing";
import { demoProfessionals } from "../../src/data/demo/fixtures";
import { demoDirectory } from "../../src/data/demo/repository";
import { safeDirectoryReturn, profileHref } from "../../src/validation/profile";
import { validateInquiry, inquiryLimits } from "../../src/validation/inquiry";

test("direct profile adapter applies public eligibility to all fixtures and missing IDs", async () => {
  for (const record of demoProfessionals) {
    const profile = await demoDirectory.getPublicProfile(record.id);
    assert.equal(!!profile, isPubliclyEligible(record));
    if (profile) assert.equal(profile.businessName, record.businessName);
  }
  assert.equal(await demoDirectory.getPublicProfile("missing"), null);
});

test("profile projection allowlists nested contact and separates listed/verified credentials", () => {
  const record = {
    ...demoProfessionals[0],
    publicContact: {
      email: "public@example.invalid",
      phone: "",
      website: "",
      privateToken: "secret-marker",
    },
    credentials: [
      { name: "Listed sample", verification: "unverified" as const },
      { name: "Reviewed sample", verification: "verified" as const },
    ],
    futurePrivateField: "secret-marker",
  };
  const profile = findPublicProfile([record], record.id)!;
  assert.deepEqual(
    Object.keys(profile).sort(),
    [
      "id",
      "businessName",
      "categoryIds",
      "city",
      "state",
      "specialty",
      "summary",
      "services",
      "verifiedCredentials",
      "freeConsultation",
      "serviceArea",
      "listedCredentials",
      "contact",
    ].sort(),
  );
  assert.deepEqual(Object.keys(profile.contact).sort(), [
    "email",
    "phone",
    "website",
  ]);
  assert.deepEqual(profile.listedCredentials, ["Listed sample"]);
  assert.deepEqual(profile.verifiedCredentials, ["Reviewed sample"]);
  for (const marker of [
    "secret-marker",
    "synthetic-owner",
    'example.invalid","ownerId',
    record.account.email,
    record.billing.customerId,
  ]) {
    assert.ok(!JSON.stringify(profile).includes(marker));
  }
  profile.contact.email = "changed";
  profile.listedCredentials.push("changed");
  assert.equal(record.publicContact.email, "public@example.invalid");
  assert.equal(record.credentials.length, 2);
  const missing = findPublicProfile(
    [
      {
        ...record,
        publicContact: undefined,
        serviceArea: undefined,
        credentials: [],
      },
    ],
    record.id,
  )!;
  assert.deepEqual(missing.contact, { email: "", phone: "", website: "" });
  assert.equal(missing.serviceArea, "");
  assert.deepEqual(missing.listedCredentials, []);
});

test("return destinations accept only validated canonical directory queries", () => {
  const valid =
    "/directory?q=mold&category=mold-inspection&location=28801&radius=50&sort=nearest&page=2";
  assert.equal(safeDirectoryReturn(valid, categories), valid);
  assert.equal(
    safeDirectoryReturn(
      "/directory?sort=az&page=1&next=https://evil.invalid",
      categories,
    ),
    "/directory",
  );
  for (const value of [
    undefined,
    [valid],
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil.invalid",
    "/directory/../demo/admin",
    "/directory#fragment",
    "/directory%3Fq=mold",
    "/%2fdirectory",
    "javascript:alert(1)",
    "/directory?q=a&q=b",
    "/directory?radius=0",
    "/directory?category=unknown",
    "/directory?page=-1",
    "/directory?sort=nearest",
    "/directory?x=" + "a".repeat(2048),
    "/directory?x=\n",
  ]) {
    assert.equal(safeDirectoryReturn(value, categories), "/directory");
  }
  const href = profileHref("demo-mold-inspection", valid);
  assert.equal(
    new URL(href, "https://local.invalid").searchParams.get("returnTo"),
    valid,
  );
  assert.equal(
    profileHref("demo-mold-inspection"),
    "/professionals/demo-mold-inspection",
  );
});

test("inquiry validation enforces types, empty fields, email and exact length boundaries", () => {
  const valid = {
    name: "Sample Homeowner",
    email: "homeowner@example.invalid",
    message: "A sample service question.",
  };
  assert.deepEqual(validateInquiry(valid), {});
  for (const field of ["name", "email", "message"] as const) {
    for (const value of [
      null,
      undefined,
      [],
      {},
      42,
      "   ",
      "x".repeat(inquiryLimits[field] + 1),
    ]) {
      assert.ok(validateInquiry({ ...valid, [field]: value })[field]);
    }
  }
  assert.deepEqual(
    validateInquiry({
      name: "n".repeat(80),
      email: "a".repeat(242) + "@example.com",
      message: "m".repeat(2000),
    }),
    {},
  );
  assert.ok(validateInquiry({ ...valid, message: "123456789" }).message);
  assert.deepEqual(validateInquiry({ ...valid, message: "1234567890" }), {});
  for (const email of [
    "missing-at",
    "a@b",
    "a b@example.invalid",
    "a@@example.invalid",
    "a@example.invalid\nBcc: other@example.invalid",
  ]) {
    assert.ok(validateInquiry({ ...valid, email }).email);
  }
  assert.deepEqual(
    validateInquiry({ ...valid, email: " homeowner@example.invalid " }),
    {},
  );
  assert.ok(
    !JSON.stringify(
      validateInquiry({ ...valid, email: "private-invalid-value" }),
    ).includes("private-invalid-value"),
  );
});
