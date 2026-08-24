# 🚀 PROMPT MESTRE DE DESENVOLVIMENTO: KUAVA POS / GESTÃO DE FATURAÇÃO

## 🎯 OBJETIVO DO PROJETO
Desenvolver um sistema SaaS B2B de Ponto de Venda (POS), Faturação e Gestão de Stock otimizado para PMEs e PMEs em Moçambique, denominado **Kuava POS**. 

O sistema deve ser ultra-rápido no balcão de vendas, funcionar em computadores e tablets modestos, permitir operação offline-first no caixa e integrar pagamentos móveis locais (M-Pesa / e-Mola) e conformidade fiscal (faturas A4/A5 e recibos térmicos).

---

## 🛠️ STACK TECNOLÓGICA OBRIGATÓRIA

### Backend (`/kuava-api`)
* **Runtime & Linguagem:** Node.js com TypeScript.
* **Framework Web:** Express.js (com arquitetura limpa em controllers, services, middlewares e routes).
* **Base de Dados & ORM:** PostgreSQL com Sequelize ORM.
* **Autenticação & Segurança:** JSON Web Token (JWT), bcryptjs para hashing de senhas, CORS e Helmet.
* **Arquitetura Multi-Tenant:** Isolamento lógico baseado em `tenant_id` obrigatório em todas as queries e tabelas.

### Frontend (`/kuava-web`)
* **Framework & Bundler:** React (TypeScript) criado com Vite.
* **UI Framework:** Material UI (MUI v5) com suporte a Dark/Light Mode e layout responsivo.
* **Gestão de Estado Global:** Zustand (para gerir o estado do carrinho do caixa em tempo real).
* **Persistência Local (Offline):** Dexie.js / IndexedDB (para armazenamento local de vendas offline).
* **Comunicação de Rede:** Axios com interceptors para envio de Token JWT.

---

## 📂 ESTRUTURA DO PROJETO

O código deve seguir rigorosamente a estrutura de pastas abaixo:

```text
kuava-root/
├── kuava-api/
│   ├── src/
│   │   ├── config/       # Configurações de BD (database.ts) e Dotenv
│   │   ├── controllers/  # Métodos HTTP (Auth, Products, Sales, Tenants)
│   │   ├── middlewares/  # authMiddleware, tenantMiddleware, errorHandler
│   │   ├── models/       # Sequelize Models (Tenant, User, Product, Sale, SaleItem)
│   │   ├── routes/       # Express Router (authRoutes, productRoutes, saleRoutes)
│   │   ├── services/     # Regras de Negócio, Cálculo de IVA e API M-Pesa
│   │   └── utils/        # Formatador de Meticais (MZN), Gerador de NUIT/PDF
│   ├── package.json
│   └── tsconfig.json
│
└── kuava-web/
    ├── src/
    │   ├── assets/       # Imagens e áudios
    │   ├── components/   # Componentes MUI (common, pos, printer)
    │   ├── hooks/        # Custom Hooks (useBarcodeScanner, useCart)
    │   ├── pages/        # Telas (pos, inventory, invoices, dashboard, settings)
    │   ├── routes/       # Configuração do React Router Dom
    │   ├── services/     # Instância Axios e endpoints
    │   ├── store/        # Zustand Store (cartStore, authStore)
    │   ├── theme/        # Tema MUI (Paleta de cores e tipografia)
    │   └── utils/        # Formatadores de Moeda MZN e Datas
    └── package.json