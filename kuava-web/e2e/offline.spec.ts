import { APIRequestContext, test, expect } from '@playwright/test';
import {
  TestProduct,
  TestTenant,
  addToCart,
  apiContext,
  closeSaleDialog,
  createProduct,
  loadTenant,
  finalizeSale,
  getStock,
  salesForProduct,
  login,
  waitForCatalog,
  pendingSalesCount,
} from './helpers';

/**
 * O caso que mais interessa ao negócio: em Moçambique a rede falha, e o
 * balcão não pode parar. A app vende a partir do catálogo em IndexedDB,
 * guarda a venda localmente com uma chave de idempotência (`clientRef`), e
 * sincroniza quando a ligação volta.
 *
 * O que estes testes protegem: que a sincronização não duplica vendas
 * (cobrar duas vezes ao comerciante) nem perde stock (vender o que já não
 * existe). A defesa no servidor é o índice único parcial
 * `sales_tenant_id_client_ref_unique` mais o `findSaleWithItemsByClientRef`
 * em saleService.ts — aqui verifica-se que funciona ponta a ponta.
 */

let api: APIRequestContext;
let tenant: TestTenant;
let produto: TestProduct;

test.beforeAll(async () => {
  api = await apiContext();
});

test.afterAll(async () => {
  await api.dispose();
});

test.beforeEach(async () => {
  tenant = loadTenant();
  // Nome único: o estabelecimento é partilhado por toda a corrida, e dois
  // produtos com o mesmo nome tornariam o addToCart ambíguo.
  produto = await createProduct(api, tenant, {
    name: `Arroz ${Date.now()}`,
    price: 200,
    stock: 30,
  });
});

test.describe('modo offline', () => {
  test('vende sem rede, guarda no dispositivo e avisa o operador', async ({ page, context }) => {
    await login(page, tenant);
    // Entrar com rede primeiro é deliberado: é assim que o catálogo fica em
    // cache local. Um POS aberto pela primeira vez já offline não tem o que
    // vender, e isso é comportamento correto, não um bug.

    // Catálogo descarregado antes de a rede cair (ver waitForCatalog).
    await waitForCatalog(page, produto.name);
    await context.setOffline(true);

    await expect(page.getByText(/Sem ligação/i)).toBeVisible();

    await addToCart(page, produto.name, 2);
    await finalizeSale(page);

    // O operador tem de perceber que a venda ainda não chegou ao servidor.
    await expect(page.getByText(/Guardada neste dispositivo/i)).toBeVisible();

    expect(await pendingSalesCount(page)).toBe(1);
    // E nada chegou ao servidor, claro.
    expect(await salesForProduct(api, tenant, produto.id)).toHaveLength(0);
  });

  test('ao voltar a rede sincroniza sem duplicar e desconta o stock uma só vez', async ({
    page,
    context,
  }) => {
    const stockAntes = await getStock(api, tenant, produto.id);

    await login(page, tenant);
    // Catálogo descarregado antes de a rede cair (ver waitForCatalog).
    await waitForCatalog(page, produto.name);
    await context.setOffline(true);

    await addToCart(page, produto.name, 3);
    await finalizeSale(page);
    await closeSaleDialog(page);
    expect(await pendingSalesCount(page)).toBe(1);

    await context.setOffline(false);
    // O evento `online` dispara o syncNow do useOfflineStore. Esperar pela
    // fila a esvaziar é o sinal de que terminou.
    await expect.poll(() => pendingSalesCount(page), { timeout: 20_000 }).toBe(0);

    const vendas = await salesForProduct(api, tenant, produto.id);
    expect(vendas, 'a venda offline devia chegar ao servidor exactamente uma vez').toHaveLength(1);
    expect(Number(vendas[0].total_amount)).toBe(600);
    expect(vendas[0].client_ref, 'a chave de idempotência tem de ser gravada').toBeTruthy();

    expect(
      await getStock(api, tenant, produto.id),
      'o stock não pode ser descontado duas vezes',
    ).toBe(stockAntes - 3);
  });

  test('várias vendas offline sincronizam todas, uma vez cada', async ({ page, context }) => {
    const stockAntes = await getStock(api, tenant, produto.id);

    await login(page, tenant);
    // Catálogo descarregado antes de a rede cair (ver waitForCatalog).
    await waitForCatalog(page, produto.name);
    await context.setOffline(true);

    // Três vendas seguidas sem rede: 1 + 2 + 1 = 4 unidades.
    for (const quantidade of [1, 2, 1]) {
      // eslint-disable-next-line no-await-in-loop
      await addToCart(page, produto.name, quantidade);
      // eslint-disable-next-line no-await-in-loop
      await finalizeSale(page);
      // eslint-disable-next-line no-await-in-loop
      await closeSaleDialog(page);
    }
    expect(await pendingSalesCount(page)).toBe(3);

    await context.setOffline(false);
    await expect.poll(() => pendingSalesCount(page), { timeout: 30_000 }).toBe(0);

    expect(await salesForProduct(api, tenant, produto.id)).toHaveLength(3);
    expect(await getStock(api, tenant, produto.id)).toBe(stockAntes - 4);
  });

  test('a venda por sincronizar sobrevive a um recarregamento da página', async ({
    page,
    context,
  }) => {
    await login(page, tenant);
    // Catálogo descarregado antes de a rede cair (ver waitForCatalog).
    await waitForCatalog(page, produto.name);
    await context.setOffline(true);

    await addToCart(page, produto.name, 2);
    await finalizeSale(page);
    await closeSaleDialog(page);

    // A rede volta primeiro, e só depois se recarrega. Não é pormenor de
    // teste: a app não regista service worker nenhum, por isso um reload
    // sem rede dá ERR_INTERNET_DISCONNECTED — o browser não tem de onde
    // buscar o index.html. Ver a nota sobre isto no e2e/README.
    await context.setOffline(false);
    await page.reload();

    // O que interessa: a venda estava no IndexedDB antes do reload e
    // continua a chegar ao servidor depois dele.
    await expect.poll(() => pendingSalesCount(page), { timeout: 20_000 }).toBe(0);
    expect(await salesForProduct(api, tenant, produto.id)).toHaveLength(1);
  });

  test('uma segunda sincronização do mesmo clientRef não cria uma venda nova', async ({
    page,
    context,
  }) => {
    // Este é o teste da idempotência propriamente dita. Reproduz o caso real
    // em que a resposta do servidor se perde a caminho do cliente: a venda
    // ficou gravada, mas o dispositivo acha que falhou e volta a enviar.
    await login(page, tenant);
    // Catálogo descarregado antes de a rede cair (ver waitForCatalog).
    await waitForCatalog(page, produto.name);
    await context.setOffline(true);

    await addToCart(page, produto.name, 2);
    await finalizeSale(page);
    await closeSaleDialog(page);

    await context.setOffline(false);
    await expect.poll(() => pendingSalesCount(page), { timeout: 20_000 }).toBe(0);

    const vendas = await salesForProduct(api, tenant, produto.id);
    expect(vendas).toHaveLength(1);
    const clientRef = vendas[0].client_ref as string;
    const stockDepoisDaPrimeira = await getStock(api, tenant, produto.id);

    // Reenvio exactamente igual, como faria um dispositivo que não viu a
    // resposta anterior.
    const reenvio = await api.post('/api/sales', {
      headers: { Authorization: `Bearer ${tenant.token}` },
      data: {
        payment_method: 'CASH',
        client_ref: clientRef,
        items: [{ product_id: produto.id, quantity: 2 }],
      },
    });
    expect(reenvio.ok(), await reenvio.text()).toBeTruthy();

    const depois = await salesForProduct(api, tenant, produto.id);
    expect(depois, 'o reenvio não pode criar uma venda nova').toHaveLength(1);
    expect(depois[0].id, 'devia devolver a venda já existente').toBe(vendas[0].id);
    expect(
      await getStock(api, tenant, produto.id),
      'um reenvio não pode voltar a descontar stock',
    ).toBe(stockDepoisDaPrimeira);
  });

  test('recupera uma venda que ficou presa em "syncing" por a app ter morrido a meio', async ({
    page,
    context,
  }) => {
    // Regressão de um bug a sério: o estado 'syncing' era escrito mesmo antes
    // do envio, mas a consulta de sincronização só procurava 'pending' e
    // 'error'. Uma app que morresse nesse intervalo — reload, separador
    // fechado, tablet sem bateria — deixava a venda presa nesse estado para
    // sempre. O comerciante vendia, o cliente pagava, e aquilo nunca chegava
    // ao servidor, com o contador a dizer "1 por sincronizar" indefinidamente.
    await login(page, tenant);
    await waitForCatalog(page, produto.name);
    await context.setOffline(true);

    await addToCart(page, produto.name, 2);
    await finalizeSale(page);
    await closeSaleDialog(page);
    expect(await pendingSalesCount(page)).toBe(1);

    // Força o estado órfão directamente no IndexedDB, em vez de tentar
    // apanhar a janela de milissegundos em que ele existe de verdade.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('kuava-pos-offline');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const store = db.transaction('pendingSales', 'readwrite').objectStore('pendingSales');
            const todas = store.getAll();
            todas.onsuccess = () => {
              const venda = todas.result[0];
              venda.status = 'syncing';
              const put = store.put(venda);
              put.onsuccess = () => {
                resolve();
                db.close();
              };
              put.onerror = () => {
                reject(put.error);
                db.close();
              };
            };
            todas.onerror = () => {
              reject(todas.error);
              db.close();
            };
          };
        }),
    );

    await context.setOffline(false);
    await page.reload();

    await expect
      .poll(() => pendingSalesCount(page), { timeout: 20_000 })
      .toBe(0);
    expect(
      await salesForProduct(api, tenant, produto.id),
      'a venda presa em syncing tinha de ser recuperada, não perdida',
    ).toHaveLength(1);
  });
});
