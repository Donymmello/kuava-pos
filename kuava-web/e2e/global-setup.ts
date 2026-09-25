import fs from 'fs';
import path from 'path';
import { request } from '@playwright/test';

/**
 * Cria UM estabelecimento para toda a corrida e grava-o em .tenant.json.
 *
 * Porque não um por teste: o registo está limitado a 5 por hora e o login a
 * 10 por cada 15 minutos, por IP (kuava-api/src/routes/authRoutes.ts). Uma
 * suite com uma dezena de testes a registar-se rebenta o limite ao quinto e
 * os restantes falham com 429 — que foi exactamente o que aconteceu na
 * primeira versão destes testes.
 *
 * O isolamento entre testes não se perde: cada teste cria o seu próprio
 * produto (POST /products não tem limite), e é o stock do produto que os
 * testes disputam, não o estabelecimento.
 */

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3333';

// Relativo à raiz do projeto (o Playwright corre a partir de kuava-web);
// __dirname não existe porque o package.json é "type": "module".
export const TENANT_FILE = path.resolve('e2e/.tenant.json');

/** O JWT dura 8h; reutiliza-se enquanto faltar mais de uma hora para expirar. */
const MARGEM_MS = 60 * 60 * 1000;

function aindaServe(): boolean {
  if (!fs.existsSync(TENANT_FILE)) {
    return false;
  }
  try {
    const { token } = JSON.parse(fs.readFileSync(TENANT_FILE, 'utf-8'));
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp * 1000 - Date.now() > MARGEM_MS;
  } catch {
    return false;
  }
}

export default async function globalSetup(): Promise<void> {
  // Reutilizar em vez de registar de novo não é só velocidade: o registo
  // está limitado a 5 por hora por IP, e correr a suite cinco vezes numa
  // manhã (que é o normal ao afinar um teste) esgotaria o limite.
  if (aindaServe()) {
    return;
  }

  const api = await request.newContext({ baseURL: API_URL });

  const suffix = `${Date.now()}`.slice(-9);
  const adminEmail = `e2e${suffix}@teste.kuava`;
  const adminPassword = 'senha12345';
  const tenantName = `Loja E2E ${suffix}`;

  const res = await api.post('/api/auth/register', {
    data: {
      tenantName,
      nuit: suffix.padStart(9, '1'),
      adminName: 'Admin E2E',
      adminEmail,
      adminPassword,
    },
  });

  if (res.status() !== 201) {
    const corpo = await res.text();
    if (res.status() === 429) {
      throw new Error(
        'O registo está limitado a 5 por hora por IP e o limite já foi atingido. ' +
          'O contador vive em memória, por isso reiniciar a API limpa-o:\n' +
          '  docker compose restart api\n' +
          `Resposta: ${corpo}`,
      );
    }
    throw new Error(`Falha ao criar o estabelecimento de teste (${res.status()}): ${corpo}`);
  }

  const body = await res.json();

  fs.writeFileSync(
    TENANT_FILE,
    JSON.stringify(
      {
        token: body.data.token,
        tenantId: body.data.user.tenantId,
        user: body.data.user,
        adminEmail,
        adminPassword,
        tenantName,
      },
      null,
      2,
    ),
  );

  await api.dispose();
}
