# Teste de carga — fecho do dia

Simula 50 terminais que venderam o dia todo offline e voltam à rede quase ao
mesmo tempo, cada um a despejar a sua fila de vendas pendentes.

## Porquê este cenário

É o pior momento do dia para a API: uma manada, não um caudal. E é o momento
em que um erro custa dinheiro a sério — uma venda duplicada na sincronização
é receita inventada no relatório do comerciante, e stock descontado a mais é
produto que ele julga não ter.

Por isso o teste falha por **correção**, não só por lentidão: a métrica
`vendas_duplicadas` tem limiar `count == 0`.

## Correr

Com a stack de desenvolvimento de pé (`docker compose up -d`):

```bash
docker compose exec -T api npx tsx src/scripts/seedLoadTest.ts > k6/seed.json
```

Cria 25 lojas × 2 terminais, com produtos e stock, e escreve `k6/seed.json`
com um token por terminal.

```bash
k6 run k6/fecho-do-dia.js
```

### Porque o seed não usa a API

O registo está limitado a 5 por hora e o login a 10 por cada 15 minutos, por
IP ([authRoutes.ts](../kuava-api/src/routes/authRoutes.ts)). O k6 corre de um
IP só: criar 50 terminais por HTTP daria 429 e o teste passaria a medir o
rate limiter.

Emitir os tokens directamente também é mais fiel ao cenário: ao fecho do dia
os terminais já têm sessão iniciada desde a manhã, ninguém faz login.

## Afinar

| Variável | Omissão | O que faz |
|---|---|---|
| `K6_LOJAS` | 25 | Lojas a criar (no seed) |
| `K6_TERMINAIS_POR_LOJA` | 2 | Terminais por loja (no seed) |
| `K6_VENDAS_POR_TERMINAL` | 20 | Vendas acumuladas por terminal |
| `K6_BASE_URL` | `http://localhost:3333/api` | API alvo |

Cem terminais, cada um com 50 vendas:

```bash
docker compose exec -T -e K6_LOJAS=50 api npx tsx src/scripts/seedLoadTest.ts > k6/seed.json
```

```bash
K6_VENDAS_POR_TERMINAL=50 k6 run k6/fecho-do-dia.js
```

## Ler o resultado

| Métrica | Significado |
|---|---|
| `vendas_duplicadas` | **Tem de ser 0.** Acima disso há um bug de idempotência |
| `reenvios_idempotentes` | Quantos reenvios do mesmo `client_ref` foram testados |
| `sincronizacao_falhada` | Fração de vendas que o servidor recusou |
| `tempo_por_venda` | Latência por venda; é o que o caixa sente à espera |

No fim, o `teardown` conta as vendas realmente gravadas por loja e compara
com o esperado. Uma divergência aparece como `Loja <id>: N vendas gravadas,
esperadas M`. É a verificação que mais vale: latência vê-se num gráfico, uma
venda a mais só se vê a contar.

## Limpar

As lojas de carga ficam na base de dados. Para as apagar (só em
desenvolvimento, nunca em produção):

```sql
DELETE FROM tenants WHERE name LIKE 'Loja Carga %';
```

O `ON DELETE CASCADE` trata dos utilizadores, produtos e vendas.
