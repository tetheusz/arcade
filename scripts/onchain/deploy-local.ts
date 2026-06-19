import fs from "node:fs";
import path from "node:path";
import { ContractFactory, JsonRpcProvider, Wallet, type InterfaceAbi } from "ethers";

const defaultRpcUrl = process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545";
const defaultPrivateKey =
  process.env.LOCAL_CHAIN_PRIVATE_KEY ??
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

type ArtifactShape = {
  abi: InterfaceAbi;
  bytecode: string;
};

async function main() {
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

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as ArtifactShape;
  const provider = new JsonRpcProvider(defaultRpcUrl);
  const wallet = new Wallet(defaultPrivateKey, provider);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(wallet.address);
  await contract.waitForDeployment();

  const deployment = {
    rpcUrl: defaultRpcUrl,
    deployer: wallet.address,
    address: await contract.getAddress(),
    deployedAt: new Date().toISOString(),
  };

  const outputDir = path.join(process.cwd(), "data", "onchain");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "local-deployment.json"),
    JSON.stringify(deployment, null, 2),
  );

  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
