import { getCloudflareContext } from "@opennextjs/cloudflare";

const LOCAL_CONTEXT_TIMEOUT_MS = 5000;

export async function getCloudflareEnv() {
  if (process.env.OPENNEXT_USE_CF_BINDINGS === "false") {
    console.warn(
      "[Cloudflare] Bindings disabled: using npm run dev without remote D1.",
    );
    throw new Error(
      "Cloudflare bindings are disabled for local dev. Use npm run dev:cf only when you intentionally need remote D1.",
    );
  }

  const contextPromise = getCloudflareContext({ async: true });

  if (process.env.NODE_ENV !== "development") {
    const { env } = await contextPromise;
    return env;
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            "Timed out while loading Cloudflare bindings. Stop npm run dev:cf or finish Cloudflare authorization.",
          ),
        ),
      LOCAL_CONTEXT_TIMEOUT_MS,
    );
  });

  const { env } = await Promise.race([contextPromise, timeoutPromise]);
  return env;
}
