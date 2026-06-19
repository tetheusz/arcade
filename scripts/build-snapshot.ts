import { buildDailySnapshot } from "@/lib/onchain/snapshot";
import { getDateKey, shiftDateKey } from "@/lib/utils";

const dateKey = process.argv[2] ?? shiftDateKey(getDateKey(), -1);

buildDailySnapshot(dateKey)
  .then((result) => {
    console.log("Snapshot built:", {
      dateKey,
      merkleRoot: result.snapshot.merkleRoot,
      participants: result.participants,
      totalPoints: result.snapshot.totalPoints,
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
