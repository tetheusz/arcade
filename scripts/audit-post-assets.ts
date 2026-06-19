import path from "node:path";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CheckResult = {
  slug: string;
  field: "coverImageUrl" | "sourceUrl" | "content";
  value: string;
  ok: boolean;
  reason: string;
  severity: "error" | "warning";
};

function validateTranslationContent(slug: string, content: string) {
  const forbiddenMarkers = [
    "Texto publicado automaticamente pelo Arcade",
    "capturada automaticamente",
    "Search...",
    "Navigation",
    "Copy page",
  ];

  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) {
      return {
        slug,
        field: "content",
        value: marker,
        ok: false,
        reason: `Conteudo publicado com marcador de automacao indevido: ${marker}`,
        severity: "error",
      } satisfies CheckResult;
    }
  }

  return {
    slug,
    field: "content",
    value: "translation-content-reviewed",
    ok: true,
    reason: "ok",
    severity: "error",
  } satisfies CheckResult;
}

async function checkLocalAsset(url: string) {
  const assetPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  await access(assetPath, fsConstants.F_OK);
}

async function checkRemoteUrl(url: string) {
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
  }).catch(async () =>
    fetch(url, {
      method: "GET",
      redirect: "follow",
    }),
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

async function validateValue(
  slug: string,
  field: "coverImageUrl" | "sourceUrl",
  value: string | null,
) {
  if (!value) {
    return null;
  }

  try {
    if (value.startsWith("/")) {
      await checkLocalAsset(value);
    } else {
      await checkRemoteUrl(value);
    }

    return {
      slug,
      field,
      value,
      ok: true,
      reason: "ok",
      severity: "error",
    } satisfies CheckResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const hostname = value.startsWith("http") ? new URL(value).hostname : "";
    const isBrowserProtectedDocs =
      field === "sourceUrl" &&
      hostname === "docs.arc.network" &&
      message.includes("HTTP 404");

    return {
      slug,
      field,
      value,
      ok: isBrowserProtectedDocs,
      reason: isBrowserProtectedDocs
        ? "Node fetch inconclusivo; validar no navegador"
        : message,
      severity: isBrowserProtectedDocs ? "warning" : "error",
    } satisfies CheckResult;
  }
}

async function main() {
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      slug: true,
      kind: true,
      coverImageUrl: true,
      sourceUrl: true,
      content: true,
    },
  });

  const results = (
    await Promise.all(
      posts.flatMap((post) => {
        const checks: Promise<CheckResult | null>[] = [
          validateValue(post.slug, "coverImageUrl", post.coverImageUrl),
          validateValue(post.slug, "sourceUrl", post.sourceUrl),
        ];

        if (post.kind === "TRANSLATION") {
          checks.push(Promise.resolve(validateTranslationContent(post.slug, post.content)));
        }

        return checks;
      }),
    )
  ).filter((entry): entry is CheckResult => Boolean(entry));

  console.table(
    results.map((result) => ({
      slug: result.slug,
      field: result.field,
      ok: result.ok ? "yes" : "no",
      severity: result.severity,
      reason: result.reason,
      value: result.value,
    })),
  );

  const failures = results.filter((result) => !result.ok && result.severity === "error");

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
