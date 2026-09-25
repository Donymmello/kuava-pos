# Testes ponta a ponta (Playwright)

Testam o fluxo de venda, as credenciais e — o que mais interessa — o modo
offline: vender sem rede, sincronizar ao voltar, e não duplicar vendas nem
perder stock.

## Onde cada coisa corre

O Docker vive dentro do WSL, mas o **Playwright corre no Windows** e fala com
os contentores por `localhost` (o WSL reencaminha as portas). Não é preciso
instalar nada dentro do WSL.

## Correr

**1. Stack de pé**, a partir do WSL:

```bash
wsl -e bash -c "sudo service docker start"
```

```bash
wsl -e bash -c "cd /mnt/c/Users/Dony/Documents/Workspace/kuava && docker compose up -d"
```

**2. Testes**, no PowerShell do Windows, a partir de `kuava-web`:

```bash
npm run e2e
```

Só o perfil de telemóvel (mais rápido, e é como o POS é usado):

```bash
npx playwright test --project=telemovel
```

Um teste só:

```bash
npx playwright test -g "sincroniza sem duplicar"
```

Com interface gráfica, para ver o browser e depurar:

```bash
npm run e2e:ui
```

Relatório da última corrida:

```bash
npm run e2e:report
```

## Se aparecer 429

O registo está limitado a 5 por hora por IP e o login a 10 por cada 15
minutos ([authRoutes.ts](../../kuava-api/src/routes/authRoutes.ts)). A suite
já está desenhada para isso — cria **um** estabelecimento por corrida no
`global-setup.ts` e reutiliza-o enquanto o token for válido (8h), e injecta a
sessão em vez de passar pelo formulário de login.

Se mesmo assim esgotares o limite, o contador vive em memória e reiniciar a
API limpa-o:

```bash
wsl -e bash -c "cd /mnt/c/Users/Dony/Documents/Workspace/kuava && docker compose restart api"
```

## Como a suite se mantém isolada

- **Um estabelecimento** por corrida (`e2e/.tenant.json`, ignorado pelo git).
- **Um produto novo por teste**, com nome único. É o stock do produto que os
  testes disputam, e `POST /products` não tem limite de ritmo.
- As contagens de vendas são **por produto**, não por estabelecimento — caso
  contrário somariam as dos testes anteriores.
- `workers: 1`: dois testes a vender em paralelo disputariam o mesmo stock.

## Limitações conhecidas da app que os testes revelaram

**Sem service worker.** Recarregar a página sem rede dá
`ERR_INTERNET_DISCONNECTED` — o browser não tem de onde buscar o `index.html`.
Na prática, se o operador fechar o separador durante um corte de rede, não
consegue reabrir a app até a rede voltar (as vendas em IndexedDB não se
perdem, mas ficam inacessíveis até lá). Um service worker resolveria isto e
tornaria a app instalável como PWA.

**Diálogo de venda concluída em ecrã pequeno.** Antes da correção em
`SaleSuccessDialog.tsx`, os botões de fatura/recibo empurravam o "Nova venda"
para lá do fundo do ecrã num telemóvel, deixando-o cortado e sem se
conseguir tocar. Passou a `fullScreen` abaixo do breakpoint `sm`.
