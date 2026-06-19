import {
  connectToXAutomationChrome,
  getNextQueuedXPost,
  type XQueueLogEntry,
  writeJsonFile,
} from "./x-web-common";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { nextEntry, log, logPath } = await getNextQueuedXPost();

  if (!nextEntry) {
    console.log(
      JSON.stringify(
        {
          status: "empty",
          message: "A fila gratuita do X já foi totalmente consumida.",
        },
        null,
        2,
      ),
    );
    return;
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          status: "ready",
          nextEntry,
          mode: "web",
        },
        null,
        2,
      ),
    );
    return;
  }

  let browser;

  try {
    browser = await connectToXAutomationChrome({
      initialUrl: "https://x.com/home",
      launchIfNeeded: true,
    });
  } catch {
    console.log(
      JSON.stringify(
        {
          status: "blocked",
          reason: "chrome-session-unavailable",
          message:
            "A automação gratuita do X não conseguiu abrir uma sessão válida. Rode `npm run x:web:login`, faça login uma vez e tente de novo.",
        },
        null,
        2,
      ),
    );
    return;
  }

  try {
    const context = browser.contexts()[0];
    const page = context.pages()[0] ?? (await context.newPage());

    await page.goto("https://x.com/home", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    if (
      page.url().includes("/i/flow/login") ||
      (await page.locator("input[autocomplete='username']").count()) > 0
    ) {
      console.log(
        JSON.stringify(
          {
            status: "blocked",
            reason: "login-required",
            message:
              "A automação gratuita do X precisa de uma sessão ativa no Chrome da automação. Rode `npm run x:web:login` e faça login uma vez.",
          },
          null,
          2,
        ),
      );
      return;
    }

    const composer = page
      .locator(
        "[data-testid='tweetTextarea_0'], div[role='textbox'][contenteditable='true']",
      )
      .first();
    await composer.waitFor({ timeout: 30000 });
    await composer.focus();
    await page.waitForTimeout(200);
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+A" : "Control+A",
    );
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText(nextEntry.text);

    const postButton = page
      .locator("button[data-testid='tweetButtonInline'], button[data-testid='tweetButton']")
      .first();
    await postButton.waitFor({ timeout: 30000 });
    await postButton.click();
    await page.waitForTimeout(3500);

    const updatedLog: XQueueLogEntry[] = [
      {
        id: nextEntry.id,
        text: nextEntry.text,
        postedAt: new Date().toISOString(),
        mode: "web",
      },
      ...log,
    ];

    await writeJsonFile(logPath, updatedLog);

    console.log(
      JSON.stringify(
        {
          status: "posted",
          nextEntry,
          mode: "web",
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
