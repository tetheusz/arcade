# Arquitetura do Arc

> Tradução em PT-BR do conteúdo oficial do Arc, com adaptação leve para leitura mais natural em português. O texto original está linkado ao fim da página.

A arquitetura do sistema do Arc integra a camada de consenso Malachite com a camada de execução Reth para processar e finalizar transações.

A documentação oficial apresenta a arquitetura do Arc a partir de dois componentes centrais: a camada de consenso e a camada de execução. Juntas, elas sustentam finalidade determinística, taxas estáveis, privacidade por opt-in e primitivas financeiras desenhadas para aplicações nativas de stablecoins.

## Camada de consenso

O Arc roda sobre o Malachite, uma implementação de alto desempenho do protocolo Byzantine Fault Tolerant (BFT) Tendermint.

Segundo a documentação, o Malachite garante:

- finalidade determinística, com blocos finalizados em menos de um segundo
- irreversibilidade, sem reorganização ou rollback das transações depois do commit
- resiliência, com validadores confirmando blocos em um modelo de Proof-of-Authority

A camada de consenso é a responsável por ordenar e finalizar as transações com segurança, oferecendo garantias de confiabilidade e performance em nível institucional.

## Camada de execução

A camada de execução do Arc é construída sobre o Reth, uma implementação em Rust da camada de execução do Ethereum.

Ela mantém o ledger e o estado da blockchain, além de adicionar componentes voltados para finanças com stablecoins:

- **Ledger e estado:** armazenam contas, saldos, smart contracts e histórico de transações
- **Fee Manager:** estabiliza e suaviza as taxas usando USDC como unidade de conta
- **Módulo de privacidade:** habilita transferências confidenciais e divulgação seletiva por meio de view keys
- **Serviços de stablecoins:** sustentam pagamentos em múltiplas moedas, conversões de FX e liquidação programática entre stablecoins suportadas

Ao combinar esses componentes, a camada de execução entrega um ambiente familiar e compatível com EVM, mas já estendido com capacidades nativas para produtos financeiros baseados em stablecoins.

## Diagrama da arquitetura do sistema

O diagrama oficial mostra essa divisão em alto nível. A camada de consenso determina a ordem das transações e finaliza os blocos. A camada de execução aplica essas transações ao ledger e as processa por meio de seus módulos internos.

## Benefícios para developers

Ao entender essa arquitetura, a própria documentação indica que você consegue:

- confiar que as transações finalizam de forma instantânea e irreversível
- construir sobre uma stack compatível com EVM já conhecida, baseada em Reth, mas com extensões nativas para stablecoins
- aproveitar componentes financeiros embutidos, como Fee Manager, privacidade, FX e pagamentos em outras stablecoins, sem depender de workarounds externos

## Leitura final

Essa página ajuda a entender que o Arc não é apenas uma EVM com branding diferente. A rede separa claramente consenso e execução para oferecer previsibilidade operacional, taxas em USDC e componentes financeiros já embutidos na base.

Para quem está estudando o ecossistema mais a fundo, essa é uma leitura importante porque explica o que realmente muda na hora de construir apps financeiros no Arc.

## Fonte oficial

- [Architecture](https://docs.arc.network/arc/concepts/system-overview)
