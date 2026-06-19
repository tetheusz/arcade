import "dotenv/config";
import {
  previewLatestPostForX,
  publishLatestPostToX,
} from "../src/lib/x-social";

function readFlag(flag: string) {
  return process.argv.includes(flag);
}

function readOption(prefix: string) {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const dryRun = readFlag("--dry-run");
  const force = readFlag("--force");
  const slug = readOption("--slug=");

  if (dryRun) {
    const preview = await previewLatestPostForX(slug);
    console.log(JSON.stringify(preview, null, 2));
    return;
  }

  const result = await publishLatestPostToX({
    explicitSlug: slug,
    force,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
