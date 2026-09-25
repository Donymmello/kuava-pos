import fs from 'fs';
import path from 'path';
import { APIRequestContext, Page, expect, request } from '@playwright/test';

/**
 * Utilitários partilhados pelos testes ponta a ponta.
 *
 * Princípio: tudo o que é *preparação* (criar estabelecimento, produtos,
 * stock) passa pela API directamente, e só o que está a ser testado passa
 * pela interface. Registar um produto a clicar em formulários antes de cada
 * venda tornaria os testes lentos e faria um teste de vendas falhar por
 * causa de um bug no ecrã de inventário.
 */

/**
 * Sem o /api no fim de propósito: o Playwright resolve um caminho iniciado
 * por "/" como absoluto contra o baseURL, o que apagaria o prefixo e daria
 * 404. Os caminhos abaixo trazem o /api explícito.
 */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333';

export interface TestTenant {
  token: string;
  tenantId: string;
  adminEmail: string;
  adminPassword: string;
  tenantName: string;
}

export interface TestProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
}

/** Sufixo único por corrida: a base de dados de desenvolvimento não é limpa entre testes. */
function unique(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export async function apiContext(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API_URL });
}

/**
 * O estabelecimento partilhado por toda a corrida, criado uma única vez pelo
 * global-setup.ts. Ler daqui em vez de registar por teste é o que mantém a
 * suite abaixo do limite de 5 registos por hora.
 */
export function loadTenant(): TestTenant & { user: Record<string, unknown> } {
  const ficheiro = path.resolve('e2e/.tenant.json');
  if (!fs.existsSync(ficheiro)) {
    throw new Error(`${ficheiro} não existe — o globalSetup não correu?`);
  }
  return JSON.parse(fs.readFileSync(ficheiro, 'utf-8'));
}

export async function createProduct(
  api: APIRequestContext,
  tenant: TestTenant,
  overrides: Partial<{ name: string; price: number; stock: number }> = {},
): Promise<TestProduct> {
  const name = overrides.name ?? `Produto E2E ${unique()}`;
  const price = overrides.price ?? 100;
  const stock = overrides.stock ?? 50;

  const res = await api.post('/api/products', {
    headers: { Authorization: `Bearer ${tenant.token}` },
    data: { name, price, stock_quantity: stock, unit: 'UN' },
  });
  expect(res.status(), await res.text()).toBe(201);

  const body = await res.json();
  return { id: body.data.id, name, price, stock };
}

/** Stock actual do produto, lido da API — a fonte de verdade, não o que o ecrã mostra. */
export async function getStock(
  api: APIRequestContext,
  tenant: TestTenant,
  productId: string,
): Promise<number> {
  const res = await api.get(`/api/products/${productId}`, {
    headers: { Authorization: `Bearer ${tenant.token}` },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  return Number(body.data.stock_quantity);
}

/**
 * As vendas que tocaram num produto específico.
 *
 * Por produto e não por estabelecimento porque o estabelecimento é
 * partilhado por toda a corrida (ver global-setup.ts): contar as vendas do
 * tenant somaria as dos testes anteriores. Cada teste cria o seu produto,
 * por isso filtrar por produto dá isolamento perfeito.
 */
export async function salesForProduct(
  api: APIRequestContext,
  tenant: TestTenant,
  productId: string,
): Promise<Array<{ id: string; total_amount: number; client_ref: string | null }>> {
  const res = await api.get('/api/sales?pageSize=200', {
    headers: { Authorization: `Bearer ${tenant.token}` },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();

  return (body.data.items as Array<{
    id: string;
    total_amount: number;
    client_ref: string | null;
    items: Array<{ product_id: string }>;
  }>).filter((venda) => venda.items.some((item) => item.product_id === productId));
}

/**
 * Põe a app com sessão iniciada sem passar pelo formulário de login.
 *
 * Não é só velocidade: o login está limitado a 10 por cada 15 minutos por
 * IP, e uma dezena de testes a autenticar-se pela interface esgota-o. O
 * formulário continua a ser exercido a sério pelos testes de credenciais,
 * que são poucos e cabem no limite.
 *
 * As chaves são as mesmas que o utils/session.ts usa.
 */
export async function login(page: Page, tenant: TestTenant & { user?: unknown }): Promise<void> {
  await page.addInitScript(
    ([token, user]) => {
      window.localStorage.setItem('kuava:auth-token', token as string);
      window.localStorage.setItem('kuava:auth-user', JSON.stringify(user));
    },
    [tenant.token, (tenant as { user?: unknown }).user],
  );

  await page.goto('/pos');

  // O POS só está utilizável quando o catálogo chegou; esperar pelo campo
  // de pesquisa evita cliques em cartões que ainda não existem.
  await expect(page.getByPlaceholder(/código de barras/i)).toBeVisible();
}

/** Entra pelo formulário a sério — só para os testes que testam o próprio login. */
export async function loginPelaInterface(page: Page, email: string, senha: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Senha/).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/**
 * Espera até o produto estar mesmo no catálogo do ecrã.
 *
 * Chamar isto ANTES de cortar a rede é essencial nos testes offline: o
 * PosPage carrega o catálogo uma vez ao montar e só então o guarda em
 * IndexedDB (cacheProducts, fire-and-forget). Se a rede cair antes disso, o
 * pedido falha, o fallback lê um cache ainda vazio e não há nada para
 * vender. Um terminal a sério também só vende offline o que já tinha
 * descarregado.
 */
export async function waitForCatalog(page: Page, productName: string): Promise<void> {
  await page.getByPlaceholder(/código de barras/i).fill(productName);
  await expect(page.getByRole('button').filter({ hasText: productName }).first()).toBeVisible();
}

/**
 * Pesquisa o produto e toca no cartão, tantas vezes quantas as unidades.
 *
 * A pesquisa não é acessório: o estabelecimento é reutilizado entre corridas
 * (ver global-setup.ts) e o catálogo acumula os produtos de todos os testes
 * já feitos. Sem filtrar, o cartão novo fica no fim de uma grelha longa e
 * fora da área visível, e o clique nunca chega lá. Filtrar primeiro também é
 * o que o operador faz de facto no balcão.
 */
export async function addToCart(page: Page, productName: string, times = 1): Promise<void> {
  const pesquisa = page.getByPlaceholder(/código de barras/i);
  await pesquisa.fill(productName);

  const card = page.getByRole('button').filter({ hasText: productName }).first();
  await expect(card).toBeVisible();

  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await card.click();
  }
}

/** Carrega em "Finalizar Venda" e espera pelo diálogo de sucesso. */
export async function finalizeSale(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Finalizar Venda/i }).click();
  await expect(page.getByText('Venda concluída')).toBeVisible();
}

/**
 * Fecha o diálogo de sucesso, deixando o POS pronto para a venda seguinte.
 *
 * Espera até o botão estar mesmo no topo no seu próprio centro antes de
 * clicar. Durante a transição de entrada do MUI o DialogContent fica por
 * cima e o Playwright recusa o clique com "intercepts pointer events";
 * confirmar a sobreposição com elementFromPoint é determinístico, ao
 * contrário de uma espera fixa, e evita mascarar o problema com um clique
 * forçado.
 */
export async function closeSaleDialog(page: Page): Promise<void> {
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();

  const botao = dialogo.getByRole('button', { name: 'Nova venda' });
  await expect(botao).toBeVisible();

  await expect
    .poll(
      async () =>
        botao.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const topo = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return topo === el || el.contains(topo);
        }),
      { timeout: 15_000, message: 'o botão "Nova venda" continuou tapado por outro elemento' },
    )
    .toBe(true);

  await botao.click();
  await expect(page.getByText('Venda concluída')).toBeHidden();
}

/**
 * Quantas vendas estão à espera de sincronizar no IndexedDB deste
 * dispositivo. Lido directamente da base local, e não do emblema no ecrã:
 * queremos saber o estado real, não o que a interface diz sobre ele.
 */
export async function pendingSalesCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('kuava-pos-offline');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('pendingSales')) {
            db.close();
            resolve(0);
            return;
          }
          const tx = db.transaction('pendingSales', 'readonly');
          const count = tx.objectStore('pendingSales').count();
          count.onsuccess = () => {
            resolve(count.result);
            db.close();
          };
          count.onerror = () => {
            reject(count.error);
            db.close();
          };
        };
      }),
  );
}
