import { PrismaClient } from "@prisma/client";
import { getDateKey, normalizeAnswer } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main() {
  const today = getDateKey();

  const challenges = [
    {
      dateKey: today,
      category: "WORD" as const,
      title: "Palavra do dia: ferramenta de deploy",
      teaser: "Uma ferramenta central do Foundry com 5 letras.",
      prompt:
        "Qual palavra de 5 letras nomeia a ferramenta do Foundry usada para compilar, testar e fazer deploy de contratos?",
      instructions: "Responda em inglês, em minúsculas e sem espaços.",
      answer: "forge",
      answerNormalized: normalizeAnswer("forge"),
      explanation:
        "Forge é a ferramenta principal do Foundry para build, teste e deploy de contratos.",
      hint: "No tutorial oficial, ela aparece em `forge init`, `forge test`, `forge build` e `forge create`.",
      payload: {
        mode: "termo",
        wordLength: 5,
        maxAttempts: 6,
        clue: "Ferramenta principal do Foundry",
      },
      difficulty: 1,
      basePoints: 10,
      sourceLabel: "manual-curated",
      status: "PUBLISHED" as const,
    },
    {
      dateKey: today,
      category: "CONNECTION" as const,
      title: "Conexão do dia: stack de deploy",
      teaser: "Monte os grupos corretos entre comandos, rede e contrato.",
      prompt:
        "Encontre os grupos de 4 termos que pertencem ao mesmo contexto dentro do fluxo de deploy no Arc.",
      instructions:
        "Selecione 4 itens por vez. Cada acerto revela um grupo completo.",
      answer: "deploy",
      answerNormalized: normalizeAnswer("deploy"),
      explanation:
        "Os grupos separam ferramentas do Foundry, elementos da Arc Testnet e componentes comuns de um contrato Solidity.",
      hint: "Pense no tutorial de deploy: comando, rede e contrato.",
      payload: {
        mode: "conexo",
        maxSelection: 4,
        maxMistakes: 4,
        groups: [
          {
            label: "Ferramentas Foundry",
            description: "Comandos e binários do toolkit usado no tutorial.",
            items: ["forge", "cast", "anvil", "chisel"],
          },
          {
            label: "Arc testnet essentials",
            description: "Itens que você usa para conectar e operar na rede.",
            items: ["rpc", "faucet", "usdc", "explorer"],
          },
          {
            label: "Peças do contrato",
            description: "Partes comuns no fluxo de escrever e publicar um contrato.",
            items: ["abi", "event", "bytecode", "constructor"],
          },
        ],
      },
      difficulty: 2,
      basePoints: 12,
      sourceLabel: "manual-curated",
      status: "PUBLISHED" as const,
    },
    {
      dateKey: today,
      category: "SECURITY" as const,
      title: "Security check: autorização insegura",
      teaser: "Reconheça o antipadrão antes do deploy.",
      prompt:
        "Qual antipadrão aparece quando um contrato usa `tx.origin` para autorizar uma ação sensível?",
      instructions: "Responda com o nome exato do antipadrão em inglês.",
      answer: "tx.origin",
      answerNormalized: normalizeAnswer("tx.origin"),
      explanation:
        "Usar `tx.origin` em autorização é um antipadrão conhecido. A prática segura normalmente envolve `msg.sender` e controle de acesso explícito.",
      hint: "A resposta é o próprio identificador problemático.",
      payload: {
        snippet:
          "function withdrawAll() external {\n  require(tx.origin == owner, \"not owner\");\n  payable(msg.sender).transfer(address(this).balance);\n}",
      },
      difficulty: 3,
      basePoints: 14,
      sourceLabel: "manual-curated",
      status: "PUBLISHED" as const,
    },
  ];

  for (const challenge of challenges) {
    await prisma.dailyChallenge.upsert({
      where: {
        dateKey_category: {
          dateKey: challenge.dateKey,
          category: challenge.category,
        },
      },
      update: challenge,
      create: challenge,
    });
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
