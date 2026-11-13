import type { AdminWorkspace } from "../../domain/admin-account";
import type { PublicDirectorySnapshot } from "./public-directory";
import type { MemberProfileFields } from "../../domain/demo-member";
import type { MemberWorkspace } from "../../domain/member-account";
import type {
  NotificationClaim,
  NotificationJobs,
  NotificationState,
  PreparedNotification,
} from "../../domain/inquiry-notification";
import type {
  InboxPage,
  InboxDetail,
  InquirySubmission,
} from "../../domain/inbox";
/** Reviewed Stage 3 RPC contract, not generated types for the private rhh schema.
 * No base tables are exposed. Generate broader types only in a scoped data stage.
 */
export type AuthDatabase = {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      rhh_submit_review: {
        Args: {
          target: string;
          payload: import("../../domain/connected-reviews").ReviewSubmission;
        };
        Returns: unknown;
      };
      rhh_member_reviews: { Args: Record<never, never>; Returns: unknown };
      rhh_admin_reviews: {
        Args: {
          filters: import("../../domain/connected-reviews").ReviewFilters;
        };
        Returns: unknown;
      };
      rhh_moderate_review: {
        Args: {
          payload: import("../../domain/connected-reviews").ReviewDecisionInput;
        };
        Returns: unknown;
      };

      rhh_admin_qa: {
        Args: { filters: import("../../domain/qa-admin").QaAdminFilters };
        Returns: unknown;
      };
      rhh_moderate_qa: {
        Args: { payload: import("../../domain/qa-admin").QaDecisionInput };
        Returns: unknown;
      };

      rhh_member_credentials: {
        Args: { payload: Record<string, unknown> };
        Returns: unknown;
      };
      rhh_admin_credentials: {
        Args: { page_number: number };
        Returns: unknown;
      };
      rhh_review_credential: {
        Args: {
          payload: import("../../domain/credential-review").CredentialDecision;
        };
        Returns: unknown;
      };
      rhh_credential_file: {
        Args: { target: string; admin_mode: boolean };
        Returns: unknown;
      };
      rhh_public_qa: { Args: { target: string | null }; Returns: unknown };
      rhh_submit_question: {
        Args: {
          payload: import("../../domain/connected-qa").QuestionSubmission;
        };
        Returns: unknown;
      };
      rhh_member_qa: {
        Args: { target: string | null; page_number: number };
        Returns: unknown;
      };
      rhh_submit_answer: {
        Args: { payload: import("../../domain/connected-qa").AnswerSubmission };
        Returns: unknown;
      };
      rhh_member_media: {
        Args: {
          action: string;
          target: string | null;
          expected_version: number | null;
          publish: boolean;
        };
        Returns: unknown;
      };
      rhh_public_profile_media: {
        Args: { target_id: string; media_id: string };
        Returns: unknown;
      };
      rhh_claim_inquiry_email: {
        Args: Record<never, never>;
        Returns: NotificationClaim | null;
      };
      rhh_prepare_inquiry_email: {
        Args: {
          target: string;
          claim_token: string;
          provider: string;
          sender: string;
          origin: string;
          mode: string;
          idempotency_seconds: number;
        };
        Returns: PreparedNotification | null;
      };
      rhh_finish_inquiry_email: {
        Args: {
          target: string;
          claim_token: string;
          outcome: string;
          code: string;
          receipt: string | null;
          retry_after_seconds: number;
        };
        Returns: { state: NotificationState };
      };
      rhh_admin_inquiry_email_jobs: {
        Args: { page_number: number };
        Returns: NotificationJobs;
      };
      rhh_retry_inquiry_email: {
        Args: { target: string; expected_version: number; reason: string };
        Returns: { queued: boolean };
      };
      rhh_submit_inquiry: {
        Args: { payload: InquirySubmission };
        Returns: { saved: boolean };
      };
      rhh_inbox: { Args: { page_number: number }; Returns: InboxPage };
      rhh_read_inquiry: {
        Args: { target: string };
        Returns: InboxDetail | null;
      };
      rhh_set_inquiry_read: {
        Args: { target: string; is_read: boolean; expected_version: number };
        Returns: InboxDetail;
      };
      rhh_admin_workspace: {
        Args: Record<never, never>;
        Returns: AdminWorkspace;
      };
      rhh_admin_decide: {
        Args: {
          target_id: string;
          expected_profile_version: number;
          expected_decision_version: number;
          decision: string;
          reason: string;
          notes: string;
        };
        Returns: AdminWorkspace;
      };
      rhh_public_directory: {
        Args: Record<never, never>;
        Returns: PublicDirectorySnapshot;
      };
      rhh_member_workspace: {
        Args: Record<never, never>;
        Returns: MemberWorkspace;
      };
      rhh_create_application: {
        Args: { profile: MemberProfileFields };
        Returns: MemberWorkspace;
      };
      rhh_save_profile: {
        Args: { profile: MemberProfileFields; expected_version: number };
        Returns: MemberWorkspace;
      };
    };
  };
};
