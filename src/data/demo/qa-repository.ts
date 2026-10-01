import "server-only";
import type { QaRepository } from "../contracts";
import { assertDemoConfiguration } from "../../domain/config";
import { findPublicProfile } from "../../domain/listing";
import { projectPublicQuestion, searchPublicQuestions } from "../../domain/qa";
import { demoProfessionals } from "./fixtures";
import { demoQuestions, demoAnswers } from "./qa-fixtures";

function guard() {
  assertDemoConfiguration(process.env);
  if (process.env.RHH_DEMO_SCENARIO === "error")
    throw new Error("Demo Q&A failure scenario");
}
function publicQuestion(question: (typeof demoQuestions)[number]) {
  return projectPublicQuestion(question, demoAnswers, (id) =>
    findPublicProfile(demoProfessionals, id)
      ? `/professionals/${encodeURIComponent(id)}`
      : undefined,
  );
}
export const demoQaRepository: QaRepository = {
  async search(query) {
    guard();
    return searchPublicQuestions(
      demoQuestions.flatMap((question) => {
        const projected = publicQuestion(question);
        return projected ? [projected] : [];
      }),
      query,
    );
  },
  async getPublicQuestion(id) {
    guard();
    const question = demoQuestions.find((item) => item.id === id);
    return question ? publicQuestion(question) : null;
  },
};
