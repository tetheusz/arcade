import crypto from "node:crypto";

type XCredentials = {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

type XUser = {
  id: string;
  name: string;
  username?: string;
};

type XPostResult = {
  id: string;
  text: string;
};

const X_API_BASE_URL = "https://api.x.com";

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function normalizeUrl(input: string) {
  const url = new URL(input);
  const port =
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
      ? ""
      : url.port;

  return `${url.protocol}//${url.hostname.toLowerCase()}${port ? `:${port}` : ""}${url.pathname}`;
}

function collectQueryParams(input: string) {
  const url = new URL(input);
  const params: Array<[string, string]> = [];

  url.searchParams.forEach((value, key) => {
    params.push([key, value]);
  });

  return params;
}

function buildSignatureBase(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
) {
  const normalizedParams = [
    ...collectQueryParams(url),
    ...Object.entries(oauthParams),
  ]
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort((a, b) => {
      if (a[0] === b[0]) {
        return a[1].localeCompare(b[1]);
      }

      return a[0].localeCompare(b[0]);
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return [
    method.toUpperCase(),
    percentEncode(normalizeUrl(url)),
    percentEncode(normalizedParams),
  ].join("&");
}

function buildOAuthHeader(
  method: string,
  url: string,
  credentials: XCredentials,
) {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  const baseString = buildSignatureBase(method, url, oauthParams);
  const signingKey = `${percentEncode(credentials.apiSecret)}&${percentEncode(
    credentials.accessTokenSecret,
  )}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams.oauth_signature = signature;

  const header = Object.entries(oauthParams)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ");

  return `OAuth ${header}`;
}

function readCredentials(): XCredentials | null {
  const apiKey = process.env.X_API_KEY?.trim() ?? "";
  const apiSecret = process.env.X_API_SECRET?.trim() ?? "";
  const accessToken = process.env.X_ACCESS_TOKEN?.trim() ?? "";
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET?.trim() ?? "";

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return null;
  }

  return {
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret,
  };
}

type XApiErrorPayload = {
  errors?: Array<{
    detail?: string;
    message?: string;
  }>;
};

async function xRequest<T extends object>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
) {
  const credentials = readCredentials();

  if (!credentials) {
    throw new Error(
      "As credenciais do X ainda não estão configuradas no ambiente.",
    );
  }

  const url = `${X_API_BASE_URL}${path}`;
  const authorization = buildOAuthHeader(method, url, credentials);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ArcadePublisher/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  const data = raw
    ? (JSON.parse(raw) as T & XApiErrorPayload)
    : ({} as T & XApiErrorPayload);

  if (!response.ok) {
    const errorDetail =
      ("errors" in data &&
        Array.isArray(data.errors) &&
        data.errors[0] &&
        (data.errors[0].detail || data.errors[0].message)) ||
      raw ||
      `Falha ao chamar a API do X (${response.status}).`;

    throw new Error(errorDetail);
  }

  return data;
}

export function isXConfigured() {
  return Boolean(readCredentials());
}

export async function getXCurrentUser() {
  const result = await xRequest<{ data: XUser }>(
    "GET",
    "/2/users/me?user.fields=username",
  );

  return result.data;
}

export async function createXPost(text: string) {
  const result = await xRequest<{ data: XPostResult }>("POST", "/2/tweets", {
    text,
  });

  return result.data;
}
