export const answerLimits = { min: 20, max: 3000 } as const;
export const moderationNoteLimit = 500;
export function parseAnswer(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const body = value.trim();
  return body.length >= answerLimits.min && body.length <= answerLimits.max
    ? body
    : null;
}
export function parseModerationNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note.length <= moderationNoteLimit ? note : null;
}
