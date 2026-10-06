import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { qaRepository } from "@/data";
import { parseQaQuery, qaHref } from "@/validation/qa";
import type { RawSearchParams } from "@/validation/directory";
import { PublicQuestions } from "@/features/qa/public-questions";
export const metadata: Metadata = {
  title: "Ask a Specialist",
  description: "Browse healthy-home service questions and answers.",
  robots: { index: false, follow: false },
};
export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const { query, errors } = parseQaQuery(params);
  let unavailable = false;
  if (!Object.keys(errors).length) {
    try {
      await qaRepository.listPublic();
    } catch {
      unavailable = true;
    }
    const raw = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach((item) => raw.append(key, item));
      else if (value !== undefined) raw.set(key, value);
    }
    const canonical = qaHref(query);
    // Client publication can add pages beyond the server fixture count.
    if ("/questions" + (raw.size ? "?" + raw : "") !== canonical)
      redirect(canonical);
  }
  return (
    <PublicQuestions query={query} errors={errors} unavailable={unavailable} />
  );
}
