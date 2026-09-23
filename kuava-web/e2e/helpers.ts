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

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333/api';

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

/** Regista um estabelecimento novo com ADMIN, directamente pela API. */
export async function createTenant(api: APIRequestContext): Promise<TestTenant> {
  const suffix = unique();
  const adminEmail = `e2e${suffix}@teste.kuava`;
  const adminPassword = 'senha12345';
  const tenantName = `Loja E2E ${suffix}`;

  const res = await api.post('/auth/register', {
    data: {
      tenantName,
      // O NUIT é único por estabelecimento; 9 dígitos derivados do sufixo.
      nuit: suffix.slice(-9).padStart(9, '1'),
      adminName: 'Admin E2E',
      adminEmail,
      adminPassword,
    },
  });
  expect(res.status(), await res.text()).toBe(201);

  const body = await res.json();
  return {
    token: body.data.token,
    tenantId: body.data.user.tenantId,
    adminEmail,
    adminPassword,
    tenantName,
  };
}

export async function createProduct(
  api: APIRequestContext,
  tenant: TestTenant,
  overrides: Partial<{ name: string; price: number; stock: number }> = {},
): Promise<TestProduct> {
  const name = overrides.name ?? `Produto E2E ${unique()}`;
  const price = overrides.price ?? 100;
  const stock = overrides.stock ?? 50;

  const res = await api.post('/products', {
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
  const res = await api.get(`/products/${productId}`, {
    headers: { Authorization: `Bearer ${tenant.token}` },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  return Number(body.data.stock_quantity);
}

/** As vendas que o servidor tem para este estabelecimento, mais recentes primeiro. */
export async function listSales(
  api: APIRequestContext,
  tenant: TestTenant,
): Promise<Array<{ id: string; total_amount: number; client_ref: string | null }>> {
  const res = await api.get('/sales', {
    headers: { Authorization: `Bearer ${tenant.token}` },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = await res.json();
  return body.data.items;
}

/** Entra na app pela interface e espera até o POS estar pronto a vender. */
export async function login(page: Page, tenant: TestTenant): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(tenant.adminEmail);
  await page.getByLabel('Senha').fill(tenant.adminPassword);
  await page.getByRole('button', { name: 'Entrar' }).click();

  // O POS só está utilizável quando o catálogo chegou; esperar pelo campo
  // de pesquisa evita cliques em cartões que ainda não existem.
  await expect(page.getByPlaceholder(/código de barras/i)).toBeVisible();
}

/** Adiciona um produto ao carrinho tocando no cartão respectivo. */
export async function addToCart(page: Page, productName: string, times = 1): Promise<void> {
  const card = page.getByRole('button').filter({ hasText: productName });
  for (let i = 0; i < times; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await card.first().click();
  }
}

/** Carrega em "Finalizar Venda" e espera pelo diálogo de sucesso. */
export async function finalizeSale(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Finalizar Venda/i }).click();
  await expect(page.getByText('Venda concluída')).toBeVisible();
}

/** Fecha o diálogo de sucesso, deixando o POS pronto para a venda seguinte. */
export async function closeSaleDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Nova venda' }).click();
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
