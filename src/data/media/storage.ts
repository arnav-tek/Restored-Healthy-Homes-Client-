import "server-only";
import { createClient } from "@supabase/supabase-js";
import { applicationMode, stagingConfiguration } from "../../domain/config";
import { profileImageOutputLimit } from "../../domain/profile-media";
/** Privileged client is confined to bytes in one private bucket, never business CRUD. */
function privateImageStorage(
  bucketName: "rhh-profile-images" | "rhh-credential-evidence",
) {
  if (applicationMode(process.env) !== "staging")
    throw new Error("Connected media requires staging.");
  const { url } = stagingConfiguration(process.env),
    key = process.env.SUPABASE_SECRET_KEY;
  if (url !== "https://xjecnuebalmmblowmtks.supabase.co")
    throw new Error("Storage is restricted to the intended staging project.");
  if (!key || !key.startsWith("sb_secret_"))
    throw new Error(
      "Configure server-only staging SUPABASE_SECRET_KEY for profile storage.",
    );
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        }),
    },
  });
  const bucket = client.storage.from(bucketName);
  return {
    async upload(path: string, bytes: Uint8Array) {
      if (bytes.length > profileImageOutputLimit)
        throw new Error("Image is too large.");
      const { error } = await bucket.upload(path, bytes, {
        contentType: "image/webp",
        cacheControl: "0",
        upsert: false,
      });
      if (error)
        throw new Error(
          "Image upload could not be confirmed. Your saved image is unchanged.",
        );
    },
    async download(path: string) {
      const { data, error } = await bucket.download(path);
      if (error || !data) throw new Error("Image unavailable.");
      return data;
    },
    async remove(path: string) {
      const { error } = await bucket.remove([path]);
      if (error) throw new Error("Cleanup pending.");
    },
  };
}

export function profileImageStorage() {
  return privateImageStorage("rhh-profile-images");
}
export function credentialEvidenceStorage() {
  return privateImageStorage("rhh-credential-evidence");
}
