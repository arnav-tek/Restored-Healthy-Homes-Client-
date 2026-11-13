"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useSessionCategories,
  useDemoSession,
} from "@/features/member/demo-session";
import { useDemoReady } from "@/components/ui/use-demo-ready";
import { searchPublicQuestions, type QaQuery } from "@/domain/qa";
import { publicSessionQuestions } from "@/domain/qa-session";
import { qaHref, parseQaQuery, type QaQueryErrors } from "@/validation/qa";
import { QuestionsView } from "./questions-view";
export function PublicQuestions({
  unavailable,
}: {
  query: QaQuery;
  errors: QaQueryErrors;
  unavailable: boolean;
}) {
  const { state } = useDemoSession();
  const categories = useSessionCategories();
  const params = useSearchParams();
  const raw: Record<string, string | string[] | undefined> = {};
  for (const key of ["q", "category", "page"]) {
    const values = params.getAll(key);
    if (values.length) raw[key] = values.length === 1 ? values[0] : values;
  }
  const { query, errors } = parseQaQuery(raw, categories);
  const ready = useDemoReady();
  const router = useRouter();
  const results =
    !unavailable && !Object.keys(errors).length
      ? searchPublicQuestions(publicSessionQuestions(state), query, categories)
      : undefined;
  const returnTo = qaHref({ ...query, page: results?.page ?? 1 });

  useEffect(() => {
    if (ready && results && results.page !== query.page)
      router.replace(returnTo, { scroll: false });
  }, [ready, results, query.page, returnTo, router]);

  return (
    <QuestionsView
      categories={categories}
      query={query}
      errors={errors}
      unavailable={unavailable}
      results={results}
      returnTo={returnTo}
    />
  );
}
