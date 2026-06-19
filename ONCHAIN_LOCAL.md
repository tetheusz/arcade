# Onchain Local MVP

O `Arcade` agora tem um MVP onchain local para provar atividade diaria antes de partir para a Arc testnet.

## O que existe

- contrato `ArcadeActivityRegistry`
- publicacao de snapshot diario com `merkleRoot`
- claim individual de atividade diaria por jogador
- scripts locais de deploy e demo

## Fluxo

1. O backend consolida um snapshot diario de atividade.
2. Cada jogador vira uma leaf com:
   - `player`
   - `profileSlug`
   - `dateKey`
   - `points`
   - `streak`
   - `solvedChallenges`
3. O owner publica o `merkleRoot` no contrato.
4. Cada jogador faz claim da sua prova individual usando `proof`.

## Rodando localmente

1. Compile o contrato:

```bash
npm run chain:compile
```

2. Suba o node local:

```bash
npm run chain:node
```

3. Em outro terminal, faça o deploy:

```bash
npm run chain:deploy:local
```

4. Rode a demo completa:

```bash
npm run chain:demo:local
```

## Arquivos gerados

- `data/onchain/local-deployment.json`
- `data/onchain/local-snapshot-demo.json`

## Proximo passo natural

Depois disso, a evolucao para Arc testnet fica:

- trocar o RPC local pelo RPC da Arc
- usar carteira real do usuario
- publicar roots reais a partir da atividade do banco
- permitir claim de badges e milestones
