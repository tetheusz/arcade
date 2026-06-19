import { AbiCoder, keccak256, concat, getAddress } from "ethers";

export type DailyActivityLeafInput = {
  player: string;
  profileSlug: string;
  dateKey: string;
  points: bigint;
  streak: bigint;
  solvedChallenges: bigint;
};

export type DailyActivitySnapshot = {
  dateKey: string;
  challengeCount: number;
  entries: DailyActivityLeafInput[];
};

type TreeLevel = string[];

const coder = AbiCoder.defaultAbiCoder();
const zeroHash = `0x${"00".repeat(32)}`;

export function hashDailyActivityLeaf(input: DailyActivityLeafInput) {
  return keccak256(
    coder.encode(
      ["address", "string", "string", "uint256", "uint256", "uint256"],
      [
        getAddress(input.player),
        input.profileSlug,
        input.dateKey,
        input.points,
        input.streak,
        input.solvedChallenges,
      ],
    ),
  );
}

function sortPair(a: string, b: string) {
  return BigInt(a) <= BigInt(b) ? [a, b] : [b, a];
}

function hashPair(a?: string, b?: string) {
  if (!a && !b) {
    return zeroHash;
  }

  if (!a) {
    return b!;
  }

  if (!b) {
    return a;
  }

  const [left, right] = sortPair(a, b);
  return keccak256(concat([left, right]));
}

export function buildMerkleLevels(leaves: string[]) {
  if (leaves.length === 0) {
    return [[zeroHash]] satisfies TreeLevel[];
  }

  const levels: TreeLevel[] = [leaves];

  while (levels[levels.length - 1].length > 1) {
    const current = levels[levels.length - 1];
    const next: string[] = [];

    for (let index = 0; index < current.length; index += 2) {
      next.push(hashPair(current[index], current[index + 1]));
    }

    levels.push(next);
  }

  return levels;
}

export function getMerkleRoot(leaves: string[]) {
  const levels = buildMerkleLevels(leaves);
  return levels[levels.length - 1][0] ?? zeroHash;
}

export function getMerkleProof(leaves: string[], targetIndex: number) {
  const levels = buildMerkleLevels(leaves);
  const proof: string[] = [];
  let index = targetIndex;

  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex += 1) {
    const level = levels[levelIndex];
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    const sibling = level[siblingIndex];

    if (sibling) {
      proof.push(sibling);
    }

    index = Math.floor(index / 2);
  }

  return proof;
}

export function buildSnapshotArtifacts(snapshot: DailyActivitySnapshot) {
  const leaves = snapshot.entries.map(hashDailyActivityLeaf);
  const root = getMerkleRoot(leaves);
  const totalPoints = snapshot.entries.reduce(
    (sum, entry) => sum + entry.points,
    BigInt(0),
  );

  return {
    dateKey: snapshot.dateKey,
    challengeCount: snapshot.challengeCount,
    participantCount: snapshot.entries.length,
    totalPoints,
    root,
    leaves,
    proofs: Object.fromEntries(
      snapshot.entries.map((entry, index) => [
        getAddress(entry.player),
        getMerkleProof(leaves, index),
      ]),
    ),
  };
}
