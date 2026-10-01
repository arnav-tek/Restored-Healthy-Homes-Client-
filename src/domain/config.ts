interface AppEnvironment {
  NODE_ENV?: string;
  RHH_APP_MODE?: string;
  VERCEL_ENV?: string;
}
export function assertDemoConfiguration(env: AppEnvironment): void {
  // Live adapters/auth are not implemented: even explicit live mode must stop.
  if (
    env.VERCEL_ENV === "production" ||
    (env.RHH_APP_MODE !== undefined && env.RHH_APP_MODE !== "demo")
  ) {
    throw new Error(
      "Live operation is unavailable. Authentication and payment integration must be implemented before launch.",
    );
  }
  if (env.NODE_ENV === "production" && env.RHH_APP_MODE !== "demo") {
    throw new Error(
      "Production is blocked. For a local demo build only, explicitly set RHH_APP_MODE=demo.",
    );
  }
}
