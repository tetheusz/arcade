import "dotenv/config";
import { getXCurrentUser, isXConfigured } from "../src/lib/x-client";

async function main() {
  if (!isXConfigured()) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          reason:
            "As variáveis X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN e X_ACCESS_TOKEN_SECRET ainda não estão configuradas.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const user = await getXCurrentUser();
  console.log(
    JSON.stringify(
      {
        ok: true,
        user,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
