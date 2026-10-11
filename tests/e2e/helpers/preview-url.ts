// Allow isolated preview runs without assuming another task's server ports.
export const previewBaseUrl =
  process.env.RHH_E2E_BASE_URL ?? "http://127.0.0.1:3100";
const errorBaseUrl =
  process.env.RHH_E2E_ERROR_BASE_URL ?? "http://127.0.0.1:3101";
export function previewUrl(path: string, errorScenario = false) {
  return new URL(path, errorScenario ? errorBaseUrl : previewBaseUrl).href;
}
