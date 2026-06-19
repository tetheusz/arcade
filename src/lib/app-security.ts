const DEFAULT_LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function appendOrigin(store: Set<string>, value: string | null | undefined) {
  const normalized = normalizeOrigin(value);

  if (normalized) {
    store.add(normalized);
  }
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function getTrustedOrigins() {
  const origins = new Set<string>();
  const configuredOrigins = process.env.APP_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  appendOrigin(origins, process.env.BETTER_AUTH_URL);
  configuredOrigins?.forEach((origin) => appendOrigin(origins, origin));

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    appendOrigin(origins, `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  if (process.env.VERCEL_URL) {
    appendOrigin(origins, `https://${process.env.VERCEL_URL}`);
  }

  if (!isProductionEnvironment()) {
    DEFAULT_LOCAL_ORIGINS.forEach((origin) => appendOrigin(origins, origin));
  }

  return [...origins];
}

export function getPrimaryOrigin() {
  return getTrustedOrigins()[0] ?? DEFAULT_LOCAL_ORIGINS[0];
}

export function isTrustedOrigin(origin: string | null | undefined) {
  const normalized = normalizeOrigin(origin);

  if (!normalized) {
    return false;
  }

  return getTrustedOrigins().includes(normalized);
}

export function getClientIp(request: Pick<Request, "headers">) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
