import type { DemoSession } from "./demo-member";
import { eligiblePublicIds } from "./public-session";
import { memberForProfessional } from "./professional-association";
import { validateInquiry } from "../validation/inquiry";

export type InquiryAction =
  | {
      type: "submit-inquiry";
      professionalId: string;
      fields: { name: string; email: string; message: string };
    }
  | { type: "new-inquiry"; professionalId: string };
export function inquiryRecipient(
  state: DemoSession,
  professionalId: string,
): string | null {
  if (!eligiblePublicIds(state).includes(professionalId)) return null;
  const memberId = memberForProfessional(professionalId, state.applicationId);
  return state.records.some((member) => member.id === memberId)
    ? memberId
    : null;
}
export function ownInquiries(state: DemoSession) {
  const identity = state.identity;
  return identity?.kind === "member"
    ? state.inquiries.filter((item) => item.memberId === identity.memberId)
    : [];
}
export function reduceInquiry(
  state: DemoSession,
  action: InquiryAction,
): DemoSession {
  if (action.type === "new-inquiry") {
    if (!state.currentInquiryByProfessional[action.professionalId])
      return state;
    const currentInquiryByProfessional = {
      ...state.currentInquiryByProfessional,
    };
    delete currentInquiryByProfessional[action.professionalId];
    return { ...state, currentInquiryByProfessional };
  }
  const memberId = inquiryRecipient(state, action.professionalId);
  if (
    !memberId ||
    state.currentInquiryByProfessional[action.professionalId] ||
    Object.keys(validateInquiry(action.fields)).length
  )
    return state;
  const id = `demo-inquiry-${state.revision + 1}`;
  return {
    ...state,
    revision: state.revision + 1,
    inquiries: [
      ...state.inquiries,
      {
        id,
        memberId,
        professionalId: action.professionalId,
        sender: `${action.fields.name.trim()} (${action.fields.email.trim()})`,
        subject: "Profile inquiry",
        message: action.fields.message.trim(),
      },
    ],
    currentInquiryByProfessional: {
      ...state.currentInquiryByProfessional,
      [action.professionalId]: id,
    },
  };
}
