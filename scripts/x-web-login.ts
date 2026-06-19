import {
  connectToXAutomationChrome,
} from "./x-web-common";

async function main() {
  const browser = await connectToXAutomationChrome({
    initialUrl: "https://x.com/i/flow/login",
    launchIfNeeded: true,
  });

  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.newPage());

  console.log(
    "Chrome aberto no perfil da automação. Faça login no X e aguarde a home carregar.",
  );

  await page.waitForURL(
    (url) =>
      url.toString().includes("x.com/home") ||
      url.toString().includes("x.com/compose/post"),
    {
      timeout: 10 * 60 * 1000,
    },
  );

  console.log("Sessão do X detectada e pronta para automação.");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
