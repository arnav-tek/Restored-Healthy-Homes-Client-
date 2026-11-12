export interface AppEnvironment {
  NODE_ENV?: string;
  RHH_APP_MODE?: string;
  VERCEL_ENV?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}
export const STAGING_PROJECT_REF = "xjecnuebalmmblowmtks";

export function stagingConfiguration(env: AppEnvironment) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url !== `https://${STAGING_PROJECT_REF}.supabase.co`) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL to the approved staging project URL.",
    );
  }
  if (!key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to a staging publishable key.",
    );
  }
  return { url, key };
}

export function applicationMode(env: AppEnvironment): "demo" | "staging" {
  if (env.VERCEL_ENV === "production") {
    throw new Error(
      "Public launch is blocked pending production readiness review.",
    );
  }
  if (env.RHH_APP_MODE === "staging") {
    stagingConfiguration(env);
    return "staging";
  }
  if (env.RHH_APP_MODE === "demo") return "demo";
  throw new Error(
    "Production is blocked. Explicitly select RHH_APP_MODE=demo or staging; public launch remains unavailable.",
  );
}

export function assertDemoConfiguration(env: AppEnvironment): void {
  if (applicationMode(env) !== "demo") {
    throw new Error(
      "Fictional demo adapters are unavailable in connected staging mode.",
    );
  }
}
