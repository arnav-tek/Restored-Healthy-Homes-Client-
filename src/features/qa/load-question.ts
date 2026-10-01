import "server-only";
import { cache } from "react";
import { qaRepository } from "@/data";
export const loadQuestion = cache((id: string) =>
  qaRepository.getPublicQuestion(id),
);
