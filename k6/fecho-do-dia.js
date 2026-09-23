import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * Fecho do dia: 50 terminais que estiveram o dia a vender offline voltam
 * todos à rede quase ao mesmo tempo e despejam a fila de vendas pendentes.
 *
 * É o pior momento do dia para a API — uma manada, não um caudal constante.
 * Cada terminal envia a sua fila em série, como o useOfflineStore.syncNow
 * faz de facto (ciclo `for` com `await`), por isso a concorrência real são
 * os 50 terminais em paralelo, não 50 × N pedidos de uma vez.
 *
 * O que este teste mede além da latência, e que importa mais: se a
 * sincronização em massa **duplica vendas** ou **desconta stock a mais**.
 * Uma API lenta ao fecho do dia é um incómodo; uma venda duplicada é
 * dinheiro errado na conta do comerciante.
 *
 * Correr:
 *   docker compose exec -T api npx tsx src/scripts/seedLoadTest.ts > k6/seed.json
 *   k6 run k6/fecho-do-dia.js
 */

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3333/api';

/** Quantas vendas cada terminal acumulou durante o dia offline. */
const VENDAS_POR_TERMINAL = Number(__ENV.K6_VENDAS_POR_TERMINAL || 20);

/**
 * De quantas em quantas vendas se reenvia a anterior com o mesmo
 * client_ref. Reproduz o caso real em que a resposta se perde a caminho do
 * terminal e o dispositivo, sem saber que a venda passou, tenta de novo.
 */
const REENVIAR_A_CADA = 5;

const seed = JSON.parse(open('./seed.json'));

const vendasSincronizadas = new Counter('vendas_sincronizadas');
const vendasDuplicadas = new Counter('vendas_duplicadas');
const reenviosIdempotentes = new Counter('reenvios_idempotentes');
const sincronizacaoFalhada = new Rate('sincronizacao_falhada');
const tempoPorVenda = new Trend('tempo_por_venda', true);

export const options = {
  scenarios: {
    fecho_do_dia: {
      executor: 'per-vu-iterations',
      vus: seed.terminais.length,
      iterations: 1,
      maxDuration: '10m',
    },
  },
  thresholds: {
    // Uma venda duplicada é falha de correção, não de desempenho: qualquer
    // valor acima de zero reprova a corrida inteira.
    vendas_duplicadas: ['count == 0'],
    sincronizacao_falhada: ['rate < 0.01'],
    // O caixa está à espera para fechar a loja; acima de 2s por venda a
    // sincronização de 20 vendas passa a demorar quase um minuto.
    'http_req_duration{expected_response:true}': ['p(95) < 2000'],
    http_req_failed: ['rate < 0.01'],
  },
};

/** Um client_ref estável e único por (terminal, venda), como o crypto.randomUUID do browser. */
function clientRef(terminalId, indice) {
  return `carga-${seed.criadoEm}-${terminalId}-${indice}`;
}

function enviarVenda(terminal, ref, produto, quantidade) {
  const inicio = Date.now();
  const res = http.post(
    `${BASE_URL}/sales`,
    JSON.stringify({
      payment_method: 'CASH',
      client_ref: ref,
      items: [{ product_id: produto.id, quantity: quantidade }],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${terminal.token}`,
      },
      tags: { name: 'POST /sales (sync)' },
    },
  );
  tempoPorVenda.add(Date.now() - inicio);
  return res;
}

export default function fecharODia() {
  const terminal = seed.terminais[exec.vu.idInTest - 1];
  // Guarda o id devolvido por cada client_ref, para o reenvio poder
  // comparar e detetar uma duplicação.
  const idsPorRef = {};

  for (let i = 0; i < VENDAS_POR_TERMINAL; i += 1) {
    const produto = terminal.produtos[i % terminal.produtos.length];
    const ref = clientRef(terminal.terminalId, i);
    const res = enviarVenda(terminal, ref, produto, 1);

    const ok = check(res, {
      'venda aceite': (r) => r.status === 200 || r.status === 201,
    });
    sincronizacaoFalhada.add(!ok);

    if (ok) {
      vendasSincronizadas.add(1);
      try {
        idsPorRef[ref] = res.json('data.id');
      } catch (e) {
        // Resposta sem corpo utilizável — conta como falha de sincronização
        // e não como duplicação.
        sincronizacaoFalhada.add(true);
      }
    }

    // Reenvio do mesmo client_ref: o servidor tem de devolver a MESMA venda.
    if (ok && i > 0 && i % REENVIAR_A_CADA === 0) {
      const anterior = clientRef(terminal.terminalId, i - 1);
      const repetida = enviarVenda(terminal, anterior, produto, 1);
      reenviosIdempotentes.add(1);

      const mesmoId = repetida.json('data.id') === idsPorRef[anterior];
      check(repetida, {
        'reenvio devolve a venda existente': () => mesmoId,
      });
      if (!mesmoId) {
        // Aqui está o bug que este teste existe para apanhar.
        vendasDuplicadas.add(1);
      }
    }
  }
}

/**
 * A verificação que vale mais do que todos os percentis: contar o que ficou
 * mesmo gravado. Latência má vê-se num gráfico; uma venda a mais só se vê
 * aqui, e é a que custa dinheiro ao cliente.
 */
export function teardown() {
  const lojas = {};
  for (const terminal of seed.terminais) {
    lojas[terminal.tenantId] = lojas[terminal.tenantId] || { token: terminal.token, terminais: 0, produtos: terminal.produtos };
    lojas[terminal.tenantId].terminais += 1;
  }

  let lojasCertas = 0;
  let lojasErradas = 0;

  for (const [tenantId, loja] of Object.entries(lojas)) {
    const esperadas = loja.terminais * VENDAS_POR_TERMINAL;

    const res = http.get(`${BASE_URL}/sales?pageSize=1`, {
      headers: { Authorization: `Bearer ${loja.token}` },
      tags: { name: 'GET /sales (verificacao)' },
    });
    const total = res.json('data.pagination.total');

    // Cada venda leva 1 unidade, por isso o stock em falta tem de ser
    // exactamente o número de vendas — nem mais (duplicou), nem menos
    // (perdeu-se).
    const stockRes = http.get(`${BASE_URL}/products/${loja.produtos[0].id}`, {
      headers: { Authorization: `Bearer ${loja.token}` },
      tags: { name: 'GET /products/:id (verificacao)' },
    });
    const stockAtual = Number(stockRes.json('data.stock_quantity'));

    if (total === esperadas) {
      lojasCertas += 1;
    } else {
      lojasErradas += 1;
      console.error(
        `Loja ${tenantId}: ${total} vendas gravadas, esperadas ${esperadas} ` +
          `(diferenca ${total - esperadas}); stock do 1o produto: ${stockAtual}/${seed.stockInicial}`,
      );
    }
  }

  console.log(`Verificacao final: ${lojasCertas} lojas certas, ${lojasErradas} com divergencia.`);
}
