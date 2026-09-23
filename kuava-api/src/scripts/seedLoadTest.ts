/**
 * Prepara lojas, produtos e terminais para o teste de carga do fecho do dia
 * (ver k6/README.md) e escreve o JSON resultante em stdout.
 *
 * Porque não passa pela API: o registo está limitado a 5 por hora e o login
 * a 10 por cada 15 minutos, por IP (ver routes/authRoutes.ts). O k6 corre
 * todo a partir de um IP só, por isso criar 50 terminais por HTTP daria 429
 * e o teste passaria a medir o rate limiter em vez da sincronização. Como no
 * cenário real os terminais já têm sessão iniciada desde a manhã, emitir os
 * tokens aqui é fiel ao que acontece, e não um atalho.
 *
 * Uso (a partir da raiz do repositório):
 *   docker compose exec -T api npx tsx src/scripts/seedLoadTest.ts > k6/seed.json
 *
 * Só stdout leva o JSON; o progresso vai para stderr, para o redireccionamento
 * acima não ficar com lixo pelo meio.
 */
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { sequelize, Product, Tenant, User } from '../models';
import { UserRole } from '../types/enums';

const LOJAS = Number(process.env.K6_LOJAS ?? 25);
const TERMINAIS_POR_LOJA = Number(process.env.K6_TERMINAIS_POR_LOJA ?? 2);
const PRODUTOS_POR_LOJA = 5;

/**
 * Stock inicial por produto, alto de propósito: se esgotasse a meio da
 * corrida, o teste passaria a medir rejeições por falta de stock em vez do
 * desempenho da sincronização.
 */
const STOCK_INICIAL = 100_000;

const SUFIXO = Date.now().toString().slice(-9);

interface TerminalSeed {
  terminalId: string;
  token: string;
  tenantId: string;
  lojaNome: string;
  produtos: Array<{ id: string; price: number }>;
}

async function main(): Promise<void> {
  if (env.nodeEnv === 'production') {
    throw new Error(
      'seedLoadTest cria dezenas de lojas falsas e nunca deve correr em produção. Aborta.',
    );
  }

  await sequelize.authenticate();

  const terminais: TerminalSeed[] = [];
  // Um hash só, reutilizado: o bcrypt é lento de propósito, e 50 hashes
  // atrasariam o seed sem nada acrescentar (ninguém faz login neste teste).
  const senhaHash = await bcrypt.hash('carga12345', 10);
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };

  for (let l = 0; l < LOJAS; l += 1) {
    // eslint-disable-next-line no-await-in-loop
    const tenant = await Tenant.create({
      name: `Loja Carga ${SUFIXO}-${l}`,
      nuit: `${SUFIXO}${String(l).padStart(3, '0')}`.slice(-9),
      address: null,
      phone: null,
      email: null,
      // Trial bem no futuro: o requireActiveSubscription responde 402 e
      // mataria a corrida se o trial destas lojas expirasse a meio.
      trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      subscription_expires_at: null,
    });

    // eslint-disable-next-line no-await-in-loop
    const produtos = await Product.bulkCreate(
      Array.from({ length: PRODUTOS_POR_LOJA }, (_, p) => ({
        tenant_id: tenant.id,
        barcode: null,
        name: `Produto ${l}-${p}`,
        price: 50 + p * 25,
        cost_price: 25 + p * 10,
        stock_quantity: STOCK_INICIAL,
        category: null,
        expiry_date: null,
      })),
    );

    for (let t = 0; t < TERMINAIS_POR_LOJA; t += 1) {
      // eslint-disable-next-line no-await-in-loop
      const user = await User.create({
        tenant_id: tenant.id,
        name: `Terminal ${l}-${t}`,
        email: `terminal-${SUFIXO}-${l}-${t}@carga.kuava`,
        password_hash: senhaHash,
        role: UserRole.CASHIER,
      });

      terminais.push({
        terminalId: `${l}-${t}`,
        token: jwt.sign(
          { sub: user.id, tenantId: tenant.id, role: user.role, email: user.email },
          env.jwt.secret,
          options,
        ),
        tenantId: tenant.id,
        lojaNome: tenant.name,
        produtos: produtos.map((p) => ({ id: p.id, price: Number(p.price) })),
      });
    }

    process.stderr.write(`loja ${l + 1}/${LOJAS}\r`);
  }

  process.stdout.write(
    `${JSON.stringify({ criadoEm: SUFIXO, stockInicial: STOCK_INICIAL, terminais }, null, 2)}\n`,
  );
  process.stderr.write(`\n${terminais.length} terminais em ${LOJAS} lojas.\n`);

  await sequelize.close();
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
