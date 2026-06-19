# Deploy on Arc

> Tradução em PT-BR do tutorial oficial do Arc, com adaptação leve para deixar a leitura mais natural em português. O material original está linkado ao fim da página.

Aprenda a fazer deploy, testar e interagir com um smart contract Solidity na Arc Testnet.

O Arc está atualmente em fase de testnet. Durante esse período, a rede pode apresentar instabilidade ou indisponibilidade não planejada. Ao longo deste texto, toda menção a Arc se refere especificamente à Arc Testnet.

Neste tutorial, você usa Solidity e Foundry para escrever, fazer deploy e interagir com um contrato simples na Arc Testnet.

## O que você vai aprender

Ao final deste tutorial, você será capaz de:

- configurar o ambiente de desenvolvimento
- configurar o Foundry para se conectar ao Arc
- implementar seu smart contract
- fazer deploy do contrato na Arc Testnet
- interagir com o contrato já publicado

## Configure o ambiente de desenvolvimento

Antes de fazer deploy no Arc, você precisa de um ambiente de desenvolvimento funcional. O tutorial oficial usa o Foundry, um toolkit portátil de desenvolvimento para Ethereum, e começa com um projeto Solidity novo.

### 1. Instale as ferramentas de desenvolvimento

```bash
curl -L https://foundry.paradigm.xyz | bash
```

### 2. Instale os binários do Foundry

```bash
foundryup
```

### 3. Inicialize um novo projeto Solidity

```bash
forge init hello-arc && cd hello-arc
```

## Configure o Foundry para interagir com o Arc

Nesta etapa, você adiciona a RPC do Arc ao projeto.

### 1. Crie um arquivo `.env`

No diretório raiz do projeto `hello-arc`, crie um arquivo chamado `.env`.

### 2. Adicione a RPC da Arc Testnet

```bash
ARC_TESTNET_RPC_URL="https://rpc.testnet.arc.network"
```

Essa URL permite que o Foundry se conecte à Arc Testnet.

Nunca envie o `.env` para o controle de versão. Guarde chaves privadas e variáveis sensíveis com cuidado.

## Implemente o smart contract

Nesta etapa, o tutorial cria o contrato `HelloArchitect`, atualiza os testes e compila o projeto.

O `HelloArchitect` é um contrato simples de armazenamento de mensagem: ele começa com uma saudação padrão, permite atualizar esse valor e emite um evento sempre que a saudação muda.

### 1. Escreva o contrato `HelloArchitect`

Primeiro, remova o template padrão:

```bash
rm src/Counter.sol
```

Depois, crie `src/HelloArchitect.sol` com o código abaixo:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract HelloArchitect {
    string private greeting;

    event GreetingChanged(string newGreeting);

    constructor() {
        greeting = "Hello Architect!";
    }

    function setGreeting(string memory newGreeting) public {
        greeting = newGreeting;
        emit GreetingChanged(newGreeting);
    }

    function getGreeting() public view returns (string memory) {
        return greeting;
    }
}
```

Esse contrato inclui:

- uma variável privada `greeting`, que guarda a saudação atual
- `setGreeting`, que atualiza o valor e emite o evento `GreetingChanged`
- `getGreeting`, que retorna o valor atual de `greeting`

### 2. Atualize scripts e testes

Como `Counter.sol` foi removido, o material oficial orienta limpar os arquivos que ainda dependem dele.

Remova a pasta `script`:

```bash
rm -rf script
```

Depois, substitua `Counter.t.sol` por `HelloArchitect.t.sol` no diretório `/test`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/HelloArchitect.sol";

contract HelloArchitectTest is Test {
    HelloArchitect helloArchitect;

    function setUp() public {
        helloArchitect = new HelloArchitect();
    }

    function testInitialGreeting() public view {
        string memory expected = "Hello Architect!";
        string memory actual = helloArchitect.getGreeting();
        assertEq(actual, expected);
    }

    function testSetGreeting() public {
        string memory newGreeting = "Welcome to Arc Chain!";
        helloArchitect.setGreeting(newGreeting);
        string memory actual = helloArchitect.getGreeting();
        assertEq(actual, newGreeting);
    }

    function testGreetingChangedEvent() public {
        string memory newGreeting = "Building on Arc!";
        vm.expectEmit(true, true, true, true);
        emit HelloArchitect.GreetingChanged(newGreeting);

        helloArchitect.setGreeting(newGreeting);
    }
}
```

### 3. Teste o contrato

```bash
forge test
```

Esse comando compila o projeto, executa os testes definidos em `HelloArchitect.t.sol` e mostra o resultado no terminal.

### 4. Compile o contrato

```bash
forge build
```

Isso cria o diretório `/out` com bytecode compilado e ABI, que serão usados no deploy.

## Faça deploy do contrato na Arc Testnet

Nesta etapa, você gera uma wallet, abastece com testnet USDC e faz o deploy do contrato com Foundry.

### 1. Gere uma wallet

```bash
cast wallet new
```

O Foundry retorna um novo par de chaves, com endereço e private key.

Guarde sua private key com segurança. Nunca compartilhe nem envie para o repositório.

Adicione a chave ao `.env`:

```bash
PRIVATE_KEY="0x..."
```

Recarregue as variáveis de ambiente:

```bash
source .env
```

### 2. Abasteça a wallet

Vá até o [Circle Faucet](https://faucet.circle.com/), selecione Arc Testnet, cole o endereço da wallet e solicite testnet USDC.

Como o USDC é o token nativo de gás na Arc Testnet, esse saldo será usado para pagar as taxas do deploy.

O testnet USDC serve apenas para testes. Ele não tem valor real e não deve ser usado em produção.

### 3. Faça o deploy do contrato

```bash
forge create src/HelloArchitect.sol:HelloArchitect \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

O tutorial oficial observa que, em produção, você nunca deve expor sua private key real e deve usar variáveis de ambiente ou ferramentas de gerenciamento de segredos.

Quando o deploy termina com sucesso, a saída mostra algo neste formato:

```text
Compiler run successful!
Deployer: 0x...
Deployed to: 0x...
Transaction hash: 0x...
```

### 4. Guarde o endereço do contrato

Copie o valor mostrado em `Deployed to:` e salve no `.env`:

```bash
HELLOARCHITECT_ADDRESS="0x..."
```

Depois, recarregue as variáveis:

```bash
source .env
```

## Interaja com o contrato publicado

Agora você pode confirmar que o deploy deu certo e chamar uma função do contrato.

### 1. Verifique a transação no explorer

Abra o [Arc Testnet Explorer](https://testnet.arcscan.app/) e cole o hash da transação do deploy para conferir os detalhes.

### 2. Use `cast` para chamar uma função

```bash
cast call $HELLOARCHITECT_ADDRESS "getGreeting()(string)" \
  --rpc-url $ARC_TESTNET_RPC_URL
```

Esse comando chama `getGreeting` e retorna o valor atual da saudação armazenada no contrato.

## Próximos passos

Depois do primeiro deploy, a própria documentação sugere estes caminhos:

- estender o `HelloArchitect` com mais lógica
- explorar recursos do Arc voltados a stablecoins, como `USDC as gas` e finalidade determinística
- construir aplicações mais avançadas para pagamentos, FX e ativos tokenizados

## Fonte oficial

- [Deploy on Arc](https://docs.arc.network/arc/tutorials/deploy-on-arc)
