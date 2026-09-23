import { APIRequestContext, test, expect } from '@playwright/test';
import {
  TestProduct,
  TestTenant,
  addToCart,
  apiContext,
  closeSaleDialog,
  createProduct,
  createTenant,
  finalizeSale,
  getStock,
  listSales,
  login,
} from './helpers';

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
  // Estabelecimento novo por teste: o stock é estado partilhado, e um teste
  // que vendesse 3 unidades estragaria as contas do seguinte.
  tenant = await createTenant(api);
  produto = await createProduct(api, tenant, { name: 'Pão de forma', price: 150, stock: 20 });
});

test.describe('fluxo de venda', () => {
  test('vende, mostra o total certo e desconta o stock', async ({ page }) => {
    const stockAntes = await getStock(api, tenant, produto.id);

    await login(page, tenant);
    await addToCart(page, produto.name, 3);

    // 3 × 150 = 450. O total é o que o operador confere antes de cobrar,
    // por isso é verificado no ecrã e não só na base de dados.
    await expect(page.getByRole('button', { name: /Finalizar Venda/i })).toContainText('450');

    await finalizeSale(page);
    await expect(page.getByText('450,00 MT')).toBeVisible();

    // O stock é a razão de ser de um POS: se a venda não o desconta, o
    // comerciante vende o que não tem.
    expect(await getStock(api, tenant, produto.id)).toBe(stockAntes - 3);

    const vendas = await listSales(api, tenant);
    expect(vendas).toHaveLength(1);
    expect(Number(vendas[0].total_amount)).toBe(450);
  });

  test('duas vendas seguidas descontam o stock das duas', async ({ page }) => {
    const stockAntes = await getStock(api, tenant, produto.id);

    await login(page, tenant);

    await addToCart(page, produto.name, 2);
    await finalizeSale(page);
    await closeSaleDialog(page);

    await addToCart(page, produto.name, 1);
    await finalizeSale(page);

    expect(await getStock(api, tenant, produto.id)).toBe(stockAntes - 3);
    expect(await listSales(api, tenant)).toHaveLength(2);
  });

  test('não deixa finalizar com o carrinho vazio', async ({ page }) => {
    await login(page, tenant);
    await expect(page.getByRole('button', { name: /Finalizar Venda/i })).toBeDisabled();
  });

  test('não deixa vender um produto sem stock', async ({ page }) => {
    const esgotado = await createProduct(api, tenant, { name: 'Produto esgotado', stock: 0 });

    await login(page, tenant);

    // O cartão existe no catálogo mas não é clicável — é assim que o
    // ProductCard trata stock <= 0 (CardActionArea disabled).
    const cartao = page.getByRole('button').filter({ hasText: esgotado.name });
    await expect(cartao.first()).toBeDisabled();
  });
});

test.describe('validação de credenciais', () => {
  test('recusa a palavra-passe errada e fica no login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(tenant.adminEmail);
    await page.getByLabel('Senha').fill('palavra-passe-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText(/inválid|incorret/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('recusa um email que não existe', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nao-existe@teste.kuava');
    await page.getByLabel('Senha').fill('senha12345');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText(/inválid|incorret/i)).toBeVisible();
  });

  test('bloqueia o POS a quem não tem sessão iniciada', async ({ page }) => {
    await page.goto('/pos');
    await expect(page).toHaveURL(/\/login/);
  });
});
