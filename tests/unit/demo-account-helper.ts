import { demoAccounts, demoPasscode } from "../../src/domain/demo-identity";
import {
  reduceDemoSession,
  type DemoSession,
  type DemoSessionSeed,
} from "../../src/domain/demo-member";
export function selectDemoAccount(
  state: DemoSession,
  memberId: string,
  seed: DemoSessionSeed,
): DemoSession {
  const account = demoAccounts(state.applicationId).find(
    (item) =>
      item.identity.kind === "member" && item.identity.memberId === memberId,
  );
  if (!account) return state;
  return reduceDemoSession(
    reduceDemoSession(state, { type: "demo-sign-out" }, seed),
    {
      type: "demo-sign-in",
      fields: { email: account.email, passcode: demoPasscode },
    },
    seed,
  );
}
