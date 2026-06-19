import fs from "node:fs";
import path from "node:path";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  id,
  type ContractTransactionResponse,
  type InterfaceAbi,
} from "ethers";
import { buildSnapshotArtifacts, type DailyActivitySnapshot } from "./merkle";

const rpcUrl = process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545";
const hardhatPrivateKeys = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
] as const;

type DeploymentShape = {
  address: string;
};

type ArtifactShape = {
  abi: InterfaceAbi;
};

type SnapshotStruct = {
  merkleRoot: string;
  participantCount: bigint;
  challengeCount: bigint;
  totalPoints: bigint;
  publishedAt: bigint;
  exists: boolean;
};

type ArcadeRegistryContract = Contract & {
  publishDailySnapshot: (
    dateKey: string,
    merkleRoot: string,
    participantCount: bigint,
    challengeCount: bigint,
    totalPoints: bigint,
  ) => Promise<ContractTransactionResponse>;
  claimDailyActivity: (
    dateKey: string,
    profileSlug: string,
    points: bigint,
    streak: bigint,
    solvedChallenges: bigint,
    proof: string[],
  ) => Promise<ContractTransactionResponse>;
  hasClaimedForDay: (dateKeyHash: string, player: string) => Promise<boolean>;
  getSnapshot: (dateKey: string) => Promise<SnapshotStruct>;
};

async function ensureDeployment(provider: JsonRpcProvider) {
  const deploymentPath = path.join(process.cwd(), "data", "onchain", "local-deployment.json");

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      "Deployment local nao encontrado. Rode `npm run chain:deploy:local` com o node local ativo.",
    );
  }

  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "ArcadeActivityRegistry.sol",
    "ArcadeActivityRegistry.json",
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error("Artifact nao encontrado. Rode `npm run chain:compile` antes.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as DeploymentShape;
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as ArtifactShape;
  const owner = new Wallet(hardhatPrivateKeys[0], provider);
  return new Contract(deployment.address, artifact.abi, owner) as ArcadeRegistryContract;
}

async function main() {
  const provider = new JsonRpcProvider(rpcUrl);
  const registry = await ensureDeployment(provider);
  const owner = new Wallet(hardhatPrivateKeys[0], provider);
  const playerOne = new Wallet(hardhatPrivateKeys[1], provider);
  const playerTwo = new Wallet(hardhatPrivateKeys[2], provider);

  const snapshot: DailyActivitySnapshot = {
    dateKey: "2026-04-08",
    challengeCount: 3,
    entries: [
      {
        player: playerOne.address,
        profileSlug: "builder-br-1",
        dateKey: "2026-04-08",
        points: BigInt(42),
        streak: BigInt(5),
        solvedChallenges: BigInt(3),
      },
      {
        player: playerTwo.address,
        profileSlug: "security-hunter",
        dateKey: "2026-04-08",
        points: BigInt(30),
        streak: BigInt(2),
        solvedChallenges: BigInt(2),
      },
    ],
  };

  const artifacts = buildSnapshotArtifacts(snapshot);

  const ownerRegistry = registry.connect(owner) as ArcadeRegistryContract;

  const publishTx = await ownerRegistry
    .publishDailySnapshot(
      snapshot.dateKey,
      artifacts.root,
      BigInt(artifacts.participantCount),
      BigInt(snapshot.challengeCount),
      artifacts.totalPoints,
    );
  const publishReceipt = await publishTx.wait();

  const dateKeyHash = id(snapshot.dateKey);
  const claimStatuses: Array<{
    player: string;
    profileSlug: string;
    status: "claimed" | "already-claimed";
    proof: string[];
  }> = [];

  for (const [index, entry] of snapshot.entries.entries()) {
    const signer = index === 0 ? playerOne : playerTwo;
    const alreadyClaimed = await registry.hasClaimedForDay(dateKeyHash, entry.player);

    if (alreadyClaimed) {
      claimStatuses.push({
        player: entry.player,
        profileSlug: entry.profileSlug,
        status: "already-claimed",
        proof: artifacts.proofs[entry.player],
      });
      continue;
    }

    const claimRegistry = registry.connect(signer) as ArcadeRegistryContract;

    const claimTx = await claimRegistry
      .claimDailyActivity(
        snapshot.dateKey,
        entry.profileSlug,
        entry.points,
        entry.streak,
        entry.solvedChallenges,
        artifacts.proofs[entry.player],
      );
    await claimTx.wait();

    claimStatuses.push({
      player: entry.player,
      profileSlug: entry.profileSlug,
      status: "claimed",
      proof: artifacts.proofs[entry.player],
    });
  }

  const result = {
    registry: await registry.getAddress(),
    rpcUrl,
    root: artifacts.root,
    publishedBy: owner.address,
    publishBlock: publishReceipt?.blockNumber ?? null,
    claims: claimStatuses,
  };

  const outputDir = path.join(process.cwd(), "data", "onchain");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "local-snapshot-demo.json"),
    JSON.stringify(result, null, 2),
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
